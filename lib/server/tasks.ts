import { and, asc, eq, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { columns, projects, sprints, tasks, users } from "@/db/schema";
import { evenPositions, needsRebalance, positionBetween } from "@/lib/position";
import type { z } from "zod";
import type { createTaskSchema, moveTaskSchema, updateTaskSchema } from "@/lib/schemas";
import type { Task } from "@/types";
import { logActivity } from "./activity";
import { ApiError, assertCan, projectByKey, type Actor } from "./guard";
import { toTask } from "./mappers";

type TaskRow = typeof tasks.$inferSelect;

export async function findTask(taskId: string): Promise<{ task: TaskRow; key: string }> {
  const [row] = await getDb()
    .select({ task: tasks, key: projects.key })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!row) throw new ApiError(404, "Task not found");
  return row;
}

async function columnInProject(columnId: string, projectId: string) {
  const [column] = await getDb().select().from(columns).where(and(eq(columns.id, columnId), eq(columns.projectId, projectId))).limit(1);
  if (!column) throw new ApiError(400, "That column is not part of this project");
  return column;
}

async function assertSprintOpen(sprintId: string, projectId: string): Promise<void> {
  const [sprint] = await getDb().select().from(sprints).where(and(eq(sprints.id, sprintId), eq(sprints.projectId, projectId))).limit(1);
  if (!sprint) throw new ApiError(400, "That sprint is not part of this project");
  if (sprint.state === "DONE") throw new ApiError(409, "That sprint is finished");
}

async function assertAssignee(userId: string): Promise<void> {
  const [user] = await getDb().select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new ApiError(400, "That person does not exist");
}

async function bottomPosition(columnId: string, excludeTaskId?: string): Promise<number | null> {
  const [row] = await getDb()
    .select({ max: sql<number | null>`max(${tasks.position})` })
    .from(tasks)
    .where(excludeTaskId ? and(eq(tasks.columnId, columnId), ne(tasks.id, excludeTaskId)) : eq(tasks.columnId, columnId));
  return row?.max ?? null;
}

export async function createTask(actor: Actor, projectKey: string, input: z.infer<typeof createTaskSchema>): Promise<Task> {
  assertCan(actor, "task:create");
  if (input.assigneeId !== null) assertCan(actor, "task:assign");
  if (input.sprintId !== null) assertCan(actor, "sprint:manage");

  const project = await projectByKey(projectKey);
  const column = await columnInProject(input.columnId, project.id);
  if (input.sprintId) await assertSprintOpen(input.sprintId, project.id);
  if (input.assigneeId) await assertAssignee(input.assigneeId);

  const db = getDb();
  // One atomic statement hands out the next number, so two people creating at once never share KEY-12.
  const [counter] = await db
    .update(projects)
    .set({ nextTaskNumber: sql`${projects.nextTaskNumber} + 1` })
    .where(eq(projects.id, project.id))
    .returning({ next: projects.nextTaskNumber });
  const number = (counter?.next ?? 2) - 1;

  const bottom = await bottomPosition(column.id);
  const [created] = await db
    .insert(tasks)
    .values({
      projectId: project.id,
      number,
      columnId: column.id,
      sprintId: input.sprintId,
      title: input.title,
      description: input.description,
      points: input.points,
      assigneeId: input.assigneeId,
      position: positionBetween(bottom, null),
      createdBy: actor.id,
      completedAt: column.isDone ? sql`now()` : null,
    })
    .returning();
  if (!created) throw new ApiError(500, "Could not create the task");

  await logActivity({ projectId: project.id, actor, action: "task.created", targetId: created.id, summary: `created ${project.key}-${number} "${input.title}" in ${column.name}` });
  return toTask(created);
}

export async function updateTask(actor: Actor, taskId: string, patch: z.infer<typeof updateTaskSchema>): Promise<Task> {
  assertCan(actor, "task:edit");
  const { task, key } = await findTask(taskId);

  const changes: string[] = [];
  const values: Partial<typeof tasks.$inferInsert> = {};

  if (patch.title !== undefined && patch.title !== task.title) {
    values.title = patch.title;
    changes.push("the title");
  }
  if (patch.description !== undefined && patch.description !== task.description) {
    values.description = patch.description;
    changes.push("the description");
  }
  if (patch.points !== undefined && patch.points !== task.points) {
    values.points = patch.points;
    changes.push(`the points to ${patch.points ?? "none"}`);
  }
  if (patch.trackedMinutes !== undefined && patch.trackedMinutes !== task.trackedMinutes) {
    values.trackedMinutes = patch.trackedMinutes;
    changes.push("the tracked time");
  }
  if (patch.assigneeId !== undefined && patch.assigneeId !== task.assigneeId) {
    assertCan(actor, "task:assign");
    if (patch.assigneeId) await assertAssignee(patch.assigneeId);
    values.assigneeId = patch.assigneeId;
    changes.push("the assignee");
  }
  if (patch.sprintId !== undefined && patch.sprintId !== task.sprintId) {
    assertCan(actor, "sprint:manage");
    if (patch.sprintId) await assertSprintOpen(patch.sprintId, task.projectId);
    values.sprintId = patch.sprintId;
    changes.push("the sprint");
  }

  if (changes.length === 0) return toTask(task);
  const [updated] = await getDb()
    .update(tasks)
    .set({ ...values, updatedAt: sql`now()` })
    .where(eq(tasks.id, taskId))
    .returning();
  if (!updated) throw new ApiError(404, "Task not found");
  await logActivity({ projectId: task.projectId, actor, action: "task.updated", targetId: taskId, summary: `changed ${changes.join(", ")} on ${key}-${task.number}` });
  return toTask(updated);
}

/** Renumbers a column's cards evenly. Only needed when repeated drops have squeezed two neighbours together. */
async function rebalanceColumn(columnId: string, excludeTaskId: string): Promise<void> {
  const db = getDb();
  const rows = await db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.columnId, columnId), ne(tasks.id, excludeTaskId))).orderBy(asc(tasks.position));
  const fresh = evenPositions(rows.length);
  await Promise.all(rows.map((row, i) => db.update(tasks).set({ position: fresh[i] ?? 0 }).where(eq(tasks.id, row.id))));
}

async function neighbourPosition(id: string | null, columnId: string, taskId: string): Promise<number | null> {
  if (!id) return null;
  const [row] = await getDb().select({ position: tasks.position, columnId: tasks.columnId }).from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!row || row.columnId !== columnId || id === taskId) throw new ApiError(400, "The card you dropped next to is not in that column");
  return row.position;
}

async function adjacentPosition(columnId: string, taskId: string, position: number, direction: "after" | "before"): Promise<number | null> {
  const db = getDb();
  const ordering = direction === "after" ? sql`${tasks.position} > ${position}` : sql`${tasks.position} < ${position}`;
  const [row] = await db
    .select({ position: tasks.position })
    .from(tasks)
    .where(and(eq(tasks.columnId, columnId), ne(tasks.id, taskId), ordering))
    .orderBy(direction === "after" ? asc(tasks.position) : sql`${tasks.position} desc`)
    .limit(1);
  return row?.position ?? null;
}

/**
 * The positions of the cards the drop landed between, read from live data. Either neighbour may be missing (top or
 * bottom of the column), and a stale client that names an inconsistent pair is corrected from the real order.
 */
async function resolveNeighbours(columnId: string, taskId: string, aboveId: string | null, belowId: string | null) {
  let above = await neighbourPosition(aboveId, columnId, taskId);
  let below = await neighbourPosition(belowId, columnId, taskId);
  if (above !== null && (below === null || below <= above)) below = await adjacentPosition(columnId, taskId, above, "after");
  else if (above === null && below !== null) above = await adjacentPosition(columnId, taskId, below, "before");
  else if (above === null && below === null) above = await bottomPosition(columnId, taskId);
  return { above, below };
}

/**
 * Moves a card, possibly to another column. The client says which cards it was dropped between; the server works
 * out the position from the live data, so a stale board can't corrupt the order. Only this one row is written.
 */
export async function moveTask(actor: Actor, taskId: string, input: z.infer<typeof moveTaskSchema>): Promise<Task> {
  assertCan(actor, "task:move");
  const { task, key } = await findTask(taskId);
  const destination = await columnInProject(input.columnId, task.projectId);

  let { above, below } = await resolveNeighbours(destination.id, taskId, input.aboveId, input.belowId);
  if (needsRebalance(above, below)) {
    // Repeated drops squeezed two cards together: renumber the column once, then work the position out again.
    await rebalanceColumn(destination.id, taskId);
    ({ above, below } = await resolveNeighbours(destination.id, taskId, input.aboveId, input.belowId));
  }

  const moved = destination.id !== task.columnId;
  const [updated] = await getDb()
    .update(tasks)
    .set({
      columnId: destination.id,
      position: positionBetween(above, below),
      // Entering a done column stamps the time; leaving one clears it. This is what the burndown reads.
      completedAt: destination.isDone ? (task.completedAt ? sql`${tasks.completedAt}` : sql`now()`) : null,
      updatedAt: sql`now()`,
    })
    .where(eq(tasks.id, taskId))
    .returning();
  if (!updated) throw new ApiError(404, "Task not found");

  if (moved) {
    const [from] = await getDb().select({ name: columns.name }).from(columns).where(eq(columns.id, task.columnId)).limit(1);
    await logActivity({ projectId: task.projectId, actor, action: "task.moved", targetId: taskId, summary: `moved ${key}-${task.number} from ${from?.name ?? "a column"} to ${destination.name}` });
  }
  return toTask(updated);
}

export async function deleteTask(actor: Actor, taskId: string): Promise<void> {
  assertCan(actor, "task:delete");
  const { task, key } = await findTask(taskId);
  await getDb().delete(tasks).where(eq(tasks.id, taskId));
  await logActivity({ projectId: task.projectId, actor, action: "task.deleted", targetId: taskId, summary: `deleted ${key}-${task.number} "${task.title}"` });
}
