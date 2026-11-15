import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { ApiError, type Actor } from "./guard";

/**
 * The signed-in user, with the role read fresh from the database on every call. The role in the session cookie is
 * only a hint for the UI: a demoted manager loses their powers immediately, and a client can never claim a role.
 */
export async function requireActor(): Promise<Actor> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new ApiError(401, "Sign in to continue");
  const [row] = await getDb().select({ id: users.id, name: users.name, role: users.role }).from(users).where(eq(users.id, id)).limit(1);
  if (!row) throw new ApiError(401, "Sign in to continue");
  return row;
}
