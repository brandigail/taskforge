import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { projects } from "@/db/schema";
import { can, type Action } from "@/lib/permissions";
import type { Role } from "@/types";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface Actor {
  id: string;
  name: string;
  role: Role;
}

/** Throws 403 unless the actor's role allows the action. Call this before touching any data. */
export function assertCan(actor: Actor, action: Action): void {
  if (!can(actor.role, action)) throw new ApiError(403, "Your role does not allow that");
}

export async function projectByKey(key: string): Promise<typeof projects.$inferSelect> {
  const [project] = await getDb().select().from(projects).where(eq(projects.key, key.toUpperCase())).limit(1);
  if (!project) throw new ApiError(404, "Project not found");
  return project;
}

/** Turns any thrown error into a JSON response, so route handlers stay short. */
export function toResponse(error: unknown): Response {
  if (error instanceof ApiError) return Response.json({ error: error.message }, { status: error.status });
  console.error("Unhandled error:", error instanceof Error ? error.message : "unknown");
  return Response.json({ error: "Something went wrong" }, { status: 500 });
}

interface Parser<T> {
  safeParse: (value: unknown) => { success: true; data: T } | { success: false; error: { issues: { message: string }[] } };
}

export async function readBody<T>(request: Request, schema: Parser<T>): Promise<T> {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new ApiError(415, "Content-Type must be application/json");
  const body: unknown = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid request");
  return parsed.data;
}
