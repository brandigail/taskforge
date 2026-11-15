import { and, asc, eq, ne, sql } from "drizzle-orm";
import type { z } from "zod";
import { getDb } from "@/db";
import { columns, tasks } from "@/db/schema";
import { positionBetween } from "@/lib/position";
import type { createColumnSchema, updateColumnSchema } from "@/lib/schemas";
import type { Column } from "@/types";
import { logActivity } from "./activity";
import { ApiError, assertCan, projectByKey, type Actor } from "./guard";
import { toColumn } from "./mappers";

type ColumnRow = typeof columns.$inferSelect;

async function findColumn(columnId: string): Promise<ColumnRow> {
  const [row] = await getDb().select().from(columns).where(eq(columns.id, columnId)).limit(1);
  if (!row) throw new ApiError(404, "Column not found");
  return row;
}

async function otherDoneColumns(projectId: string, exceptId: string): Promise<number> {
  const rows = await getDb().select({ id: columns.id }).from(columns).where(and(eq(columns.projectId, projectId), eq(columns.isDone, true), ne(columns.id, exceptId)));
  return rows.length;
}

export async function createColumn(actor: Actor, projectKey: string, input: z.infer<typeof createColumnSchema>): Promise<Column> {
  assertCan(actor, "column:manage");
  const project = await projectByKey(projectKey);
  const [last] = await getDb().select({ max: sql<number | null>`max(${columns.position})` }).from(columns).where(eq(columns.projectId, project.id));
  const [created] = await getDb()
    .insert(columns)
    .values({ projectId: project.id, name: input.name, isDone: input.isDone, position: positionBetween(last?.max ?? null, null) })
    .returning();
  if (!created) throw new ApiError(500, "Could not create the column");
  await logActivity({ projectId: project.id, actor, action: "column.created", targetId: created.id, summary: `added the column "${created.name}"` });
  return toColumn(created);
}

export async function updateColumn(actor: Actor, columnId: string, patch: z.infer<typeof updateColumnSchema>): Promise<Column> {
  assertCan(actor, "column:manage");
  const column = await findColumn(columnId);
  const db = getDb();

  if (patch.isDone === false && column.isDone && (await otherDoneColumns(column.projectId, column.id)) === 0) {
    throw new ApiError(409, "A board needs at least one done column, or nothing can ever be finished");
  }

  const [updated] = await db
    .update(columns)
    .set({ ...(patch.name !== undefined ? { name: patch.name } : {}), ...(patch.isDone !== undefined ? { isDone: patch.isDone } : {}) })
    .where(eq(columns.id, columnId))
    .returning();
  if (!updated) throw new ApiError(404, "Column not found");

  // Changing what "done" means re-stamps the cards already in the column, so reports stay truthful.
  if (patch.isDone !== undefined && patch.isDone !== column.isDone) {
    await db.update(tasks).set({ completedAt: patch.isDone ? sql`coalesce(${tasks.completedAt}, now())` : null }).where(eq(tasks.columnId, columnId));
  }
  const changed = [patch.name !== undefined && patch.name !== column.name ? `renamed "${column.name}" to "${patch.name}"` : null, patch.isDone !== undefined && patch.isDone !== column.isDone ? `${patch.isDone ? "marked" : "unmarked"} "${updated.name}" as a done column` : null].filter(Boolean);
  if (changed.length) await logActivity({ projectId: column.projectId, actor, action: "column.updated", targetId: columnId, summary: changed.join(" and ") });
  return toColumn(updated);
}

/** Deleting a column with cards in it needs somewhere for them to go. */
export async function deleteColumn(actor: Actor, columnId: string, moveToColumnId: string | null): Promise<void> {
  assertCan(actor, "column:manage");
  const column = await findColumn(columnId);
  const db = getDb();

  const siblings = await db.select().from(columns).where(and(eq(columns.projectId, column.projectId), ne(columns.id, columnId))).orderBy(asc(columns.position));
  if (siblings.length === 0) throw new ApiError(409, "A board needs at least one column");
  if (column.isDone && (await otherDoneColumns(column.projectId, columnId)) === 0) throw new ApiError(409, "A board needs at least one done column");

  const cards = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.columnId, columnId));
  if (cards.length > 0) {
    const target = siblings.find((c) => c.id === moveToColumnId);
    if (!target) throw new ApiError(409, "This column has cards in it. Choose where they should go.");
    const [last] = await db.select({ max: sql<number | null>`max(${tasks.position})` }).from(tasks).where(eq(tasks.columnId, target.id));
    let position = last?.max ?? 0;
    for (const card of cards) {
      position = positionBetween(position, null);
      await db.update(tasks).set({ columnId: target.id, position, completedAt: target.isDone ? sql`coalesce(${tasks.completedAt}, now())` : null }).where(eq(tasks.id, card.id));
    }
  }

  await db.delete(columns).where(eq(columns.id, columnId));
  await logActivity({ projectId: column.projectId, actor, action: "column.deleted", targetId: columnId, summary: `deleted the column "${column.name}"${cards.length ? ` and moved ${cards.length} card${cards.length === 1 ? "" : "s"}` : ""}` });
}
