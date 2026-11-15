import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "@/types";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const user = (await auth())?.user;
  if (!user?.id) return null;
  return { id: user.id, name: user.name ?? "Teammate", email: user.email ?? "", role: user.role };
}

/** For pages: send signed-out visitors to the login screen and bring them back afterwards. */
export async function requireUser(returnTo: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}
