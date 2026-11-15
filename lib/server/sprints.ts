import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import { getDb } from "@/db";
import { columns, sprints, tasks } from "@/db/schema";
import { completedPoints, totalPoints } from "@/lib/sprint-math";
import type { createSprintSchema } from "@/lib/schemas";
import type { Sprint } from "@/types";
import { logActivity } from "./activity";
import { ApiError, assertCan, projectByKey, type Actor } from "./guard";
import { toSprint } from "./mappers";

type SprintRow = typeof sprints.$inferSelect;

async function findSprint(sprintId: string): Promise<SprintRow> {
  const [row] = await getDb().select().from(sprints).where(eq(sprints.id, sprintId)).limit(1);
  if (!row) throw new ApiError(404, "Sprint not found");
  return row;
}

export async function createSprint(actor: Actor, projectKey: string, input: z.infer<typeof createSprintSchema>): Promise<Sprint> {
  assertCan(actor, "sprint:manage");
  const project = await projectByKey(projectKey);
  const [created] = await getDb().insert(sprints).values({ projectId: project.id, ...input }).returning();
  if (!created) throw new ApiError(500, "Could not create the sprint");
  await logActivity({ projectId: project.id, actor, action: "sprint.created", targetId: created.id, summary: `planned ${created.name} (${created.startsAt} to ${created.endsAt})` });
  return toSprint(created);
}

export async function startSprint(actor: Actor, sprintId: string): Promise<Sprint> {
  assertCan(actor, "sprint:manage");
  const sprint = await findSprint(sprintId);
  if (sprint.state !== "PLANNED") throw new ApiError(409, "Only a planned sprint can be started");
  const db = getDb();
  const [active] = await db.select({ name: sprints.name }).from(sprints).where(and(eq(sprints.projectId, sprint.projectId), eq(sprints.state, "ACTIVE"))).limit(1);
  if (active) throw new ApiError(409, `${active.name} is still active. Complete it first.`);
  const [updated] = await db.update(sprints).set({ state: "ACTIVE" }).where(eq(sprints.id, sprintId)).returning();
  if (!updated) throw new ApiError(404, "Sprint not found");
  await logActivity({ projectId: sprint.projectId, actor, action: "sprint.started", targetId: sprintId, summary: `started ${sprint.name}` });
  return toSprint(updated);
}

/**
 * Finishing a sprint snapshots what was committed and what got done (so velocity survives), sends unfinished work
 * back to the backlog, and leaves finished work in the sprint as a record.
 */
export async function completeSprint(actor: Actor, sprintId: string): Promise<Sprint> {
  assertCan(actor, "sprint:manage");
  const sprint = await findSprint(sprintId);
  if (sprint.state !== "ACTIVE") throw new ApiError(409, "Only an active sprint can be completed");
  const db = getDb();

  const cards = await db
    .select({ id: tasks.id, points: tasks.points, completedAt: tasks.completedAt, isDone: columns.isDone })
    .from(tasks)
    .innerJoin(columns, eq(columns.id, tasks.columnId))
    .where(eq(tasks.sprintId, sprintId));
  const forMath = cards.map((c) => ({ points: c.points, completedAt: c.isDone ? (c.completedAt?.toISOString() ?? new Date().toISOString()) : null }));
  const committed = totalPoints(forMath);
  const done = completedPoints(forMath);
  const unfinished = cards.filter((c) => !c.isDone);

  for (const card of unfinished) await db.update(tasks).set({ sprintId: null }).where(eq(tasks.id, card.id));
  const [updated] = await db
    .update(sprints)
    .set({ state: "DONE", completedAt: new Date(), committedPoints: committed, completedPoints: done })
    .where(eq(sprints.id, sprintId))
    .returning();
  if (!updated) throw new ApiError(404, "Sprint not found");

  await logActivity({
    projectId: sprint.projectId,
    actor,
    action: "sprint.completed",
    targetId: sprintId,
    summary: `completed ${sprint.name}: ${done} of ${committed} points done${unfinished.length ? `, ${unfinished.length} unfinished card${unfinished.length === 1 ? "" : "s"} back to the backlog` : ""}`,
  });
  return toSprint(updated);
}
