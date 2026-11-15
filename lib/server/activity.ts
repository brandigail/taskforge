import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { activity, users } from "@/db/schema";
import type { ActivityEntry } from "@/types";
import type { Actor } from "./guard";

export interface ActivityInput {
  projectId: string;
  actor: Actor;
  action: string;
  targetId: string;
  summary: string;
}

/**
 * The only place an audit entry is written. Every mutation calls this once, so the feed can't drift out of step
 * with what actually happened.
 */
export async function logActivity(input: ActivityInput): Promise<void> {
  await getDb().insert(activity).values({
    projectId: input.projectId,
    actorId: input.actor.id,
    action: input.action,
    targetId: input.targetId,
    summary: input.summary,
  });
}

export async function listActivity(projectId: string, limit = 100): Promise<ActivityEntry[]> {
  const rows = await getDb()
    .select({ entry: activity, actorName: users.name })
    .from(activity)
    .innerJoin(users, eq(users.id, activity.actorId))
    .where(eq(activity.projectId, projectId))
    .orderBy(desc(activity.at))
    .limit(limit);
  return rows.map(({ entry, actorName }) => ({
    id: entry.id,
    projectId: entry.projectId,
    actorId: entry.actorId,
    actorName,
    action: entry.action,
    targetId: entry.targetId,
    summary: entry.summary,
    at: entry.at.toISOString(),
  }));
}
