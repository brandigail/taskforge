import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db";
import { tasks, users } from "@/db/schema";
import { listActivity } from "./activity";
import { createColumn, deleteColumn, updateColumn } from "./columns";
import { ApiError, type Actor } from "./guard";
import { createProject, deleteProject, listProjects, loadBoard } from "./projects";
import { completeSprint, createSprint, startSprint } from "./sprints";
import { createTask, deleteTask, moveTask, updateTask } from "./tasks";

const hasDb = Boolean(process.env.DATABASE_URL);
const stamp = Date.now().toString(36).toUpperCase();

async function makeActor(label: string, role: Actor["role"]): Promise<Actor> {
  const [row] = await getDb()
    .insert(users)
    .values({ name: `Test ${label}`, email: `${label}-${stamp}@test.taskforge`, passwordHash: "x", role })
    .returning();
  if (!row) throw new Error("could not create test user");
  return { id: row.id, name: row.name, role };
}

async function status(promise: Promise<unknown>): Promise<number> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error.status;
    throw error;
  }
  return 200;
}

const body = { description: "", points: null, assigneeId: null, sprintId: null } as const;

describe.skipIf(!hasDb)("TaskForge services (real database)", () => {
  let admin: Actor;
  let manager: Actor;
  let contributor: Actor;
  const keys: string[] = [];
  const key = `T${stamp.slice(-4)}`;
  let todo = "";
  let doing = "";
  let done = "";

  const board = () => loadBoard(key);
  const order = async (columnId: string) => (await board()).tasks.filter((t) => t.columnId === columnId).sort((a, b) => a.position - b.position).map((t) => t.title);
  const make = async (title: string, columnId = todo) => (await createTask(contributor, key, { ...body, columnId, title })).id;

  beforeAll(async () => {
    [admin, manager, contributor] = await Promise.all([makeActor("admin", "ADMIN"), makeActor("manager", "MANAGER"), makeActor("contributor", "CONTRIBUTOR")]);
    await createProject(manager, { key, name: "Test project", description: "" });
    keys.push(key);
    const columns = (await board()).columns;
    todo = columns.find((c) => c.name === "To do")?.id ?? "";
    doing = columns.find((c) => c.name === "In progress")?.id ?? "";
    done = columns.find((c) => c.name === "Done")?.id ?? "";
  });

  afterAll(async () => {
    for (const k of keys) await deleteProject(admin, k).catch(() => undefined);
    await getDb().delete(users).where(inArray(users.id, [admin.id, manager.id, contributor.id]));
  });

  describe("roles are enforced on the server", () => {
    it("lets a contributor work on tasks but nothing structural", async () => {
      expect(await status(createProject(contributor, { key: `X${stamp.slice(-3)}`, name: "Nope", description: "" }))).toBe(403);
      expect(await status(createColumn(contributor, key, { name: "Review", isDone: false }))).toBe(403);
      expect(await status(createSprint(contributor, key, { name: "S", goal: "", startsAt: "2025-03-03", endsAt: "2025-03-14" }))).toBe(403);
      const id = await make("Contributor task");
      expect(await status(updateTask(contributor, id, { title: "Renamed by contributor" }))).toBe(200);
      expect(await status(moveTask(contributor, id, { columnId: doing, aboveId: null, belowId: null }))).toBe(200);
      expect(await status(updateTask(contributor, id, { assigneeId: manager.id }))).toBe(403);
      expect(await status(createTask(contributor, key, { ...body, columnId: todo, title: "x", assigneeId: manager.id }))).toBe(403);
      expect(await status(deleteTask(contributor, id))).toBe(403);
    });

    it("lets a manager manage structure but only an admin delete a project", async () => {
      expect(await status(createColumn(manager, key, { name: "Review", isDone: false }))).toBe(200);
      expect(await status(deleteProject(manager, key))).toBe(403);
      const extra = `Y${stamp.slice(-3)}`;
      await createProject(manager, { key: extra, name: "Throwaway", description: "" });
      expect(await status(deleteProject(admin, extra))).toBe(200);
    });

    it("refuses duplicate project keys", async () => {
      expect(await status(createProject(manager, { key, name: "Again", description: "" }))).toBe(409);
    });
  });

  describe("task numbers", () => {
    it("never hand out the same number twice, even when created at the same moment", async () => {
      const created = await Promise.all(Array.from({ length: 5 }, (_, i) => createTask(manager, key, { ...body, columnId: todo, title: `Parallel ${i}` })));
      const numbers = created.map((t) => t.number);
      expect(new Set(numbers).size).toBe(5);
    });
  });

  describe("drag and drop ordering", () => {
    it("places a card between two others and writes only that card", async () => {
      const [a, b, c, d] = [await make("OA", doing), await make("OB", doing), await make("OC", doing), await make("OD", doing)];
      const before = (await board()).tasks.filter((t) => [a, b, c].includes(t.id)).map((t) => [t.id, t.position]);
      await moveTask(contributor, d, { columnId: doing, aboveId: a, belowId: b });
      const names = (await order(doing)).filter((t) => t.startsWith("O"));
      expect(names).toEqual(["OA", "OD", "OB", "OC"]);
      const after = (await board()).tasks.filter((t) => [a, b, c].includes(t.id)).map((t) => [t.id, t.position]);
      expect(after).toEqual(before); // the other cards' positions did not change
    });

    it("handles the top, the bottom and an empty column", async () => {
      const ids = [await make("PA", doing), await make("PB", doing)];
      await moveTask(contributor, ids[1] ?? "", { columnId: doing, aboveId: null, belowId: ids[0] ?? "" });
      expect((await order(doing)).filter((t) => t.startsWith("P"))).toEqual(["PB", "PA"]);
      await moveTask(contributor, ids[1] ?? "", { columnId: doing, aboveId: ids[0] ?? "", belowId: null });
      expect((await order(doing)).filter((t) => t.startsWith("P"))).toEqual(["PA", "PB"]);
      const lone = await make("PLone");
      await moveTask(contributor, lone, { columnId: (await board()).columns.find((c) => c.name === "Review")?.id ?? "", aboveId: null, belowId: null });
      expect((await board()).tasks.find((t) => t.id === lone)?.columnId).not.toBe(todo);
    });

    it("stamps completion when a card enters a done column and clears it when it leaves", async () => {
      const id = await make("Finish me");
      expect((await board()).tasks.find((t) => t.id === id)?.completedAt).toBeNull();
      await moveTask(contributor, id, { columnId: done, aboveId: null, belowId: null });
      expect((await board()).tasks.find((t) => t.id === id)?.completedAt).not.toBeNull();
      await moveTask(contributor, id, { columnId: todo, aboveId: null, belowId: null });
      expect((await board()).tasks.find((t) => t.id === id)?.completedAt).toBeNull();
    });

    it("corrects a stale client and refuses neighbours from another column", async () => {
      const [a, b] = [await make("QA", doing), await make("QB", doing)];
      const moving = await make("QMove", doing);
      // neighbours named in the wrong order: the server falls back to the real order
      expect(await status(moveTask(contributor, moving, { columnId: doing, aboveId: b, belowId: a }))).toBe(200);
      const names = (await order(doing)).filter((t) => t.startsWith("Q"));
      expect(names.indexOf("QMove")).toBeGreaterThan(names.indexOf("QB"));
      const elsewhere = await make("QElsewhere", todo);
      expect(await status(moveTask(contributor, moving, { columnId: doing, aboveId: elsewhere, belowId: null }))).toBe(400);
    });

    it("renumbers a squeezed column instead of failing", async () => {
      const [a, b] = [await make("SQ-A", doing), await make("SQ-B", doing)];
      const mover = await make("SQ-Move", doing);
      await getDb().update(tasks).set({ position: 5000 }).where(eq(tasks.id, a));
      await getDb().update(tasks).set({ position: 5000 + 1e-9 }).where(eq(tasks.id, b));
      await moveTask(contributor, mover, { columnId: doing, aboveId: a, belowId: b });
      const names = (await order(doing)).filter((t) => t.startsWith("SQ-"));
      expect(names).toEqual(["SQ-A", "SQ-Move", "SQ-B"]);
    });
  });

  describe("columns", () => {
    it("needs a destination to delete a column that has cards, and keeps a done column", async () => {
      const col = await createColumn(manager, key, { name: "Temp", isDone: false });
      const id = await make("In temp", col.id);
      expect(await status(deleteColumn(manager, col.id, null))).toBe(409);
      expect(await status(deleteColumn(manager, col.id, todo))).toBe(200);
      expect((await board()).tasks.find((t) => t.id === id)?.columnId).toBe(todo);
      expect(await status(deleteColumn(manager, done, todo))).toBe(409); // the only done column
      expect(await status(updateColumn(manager, done, { isDone: false }))).toBe(409);
    });

    it("re-stamps cards when a column becomes a done column", async () => {
      const col = await createColumn(manager, key, { name: "Shipped", isDone: false });
      const id = await make("Ship it", col.id);
      expect((await board()).tasks.find((t) => t.id === id)?.completedAt).toBeNull();
      await updateColumn(manager, col.id, { isDone: true });
      expect((await board()).tasks.find((t) => t.id === id)?.completedAt).not.toBeNull();
      await updateColumn(manager, col.id, { isDone: false });
      expect((await board()).tasks.find((t) => t.id === id)?.completedAt).toBeNull();
    });
  });

  describe("sprints", () => {
    it("runs a sprint: one active at a time, snapshot on completion, unfinished work back to the backlog", async () => {
      const s1 = await createSprint(manager, key, { name: "Sprint A", goal: "", startsAt: "2025-03-03", endsAt: "2025-03-14" });
      const s2 = await createSprint(manager, key, { name: "Sprint B", goal: "", startsAt: "2025-03-17", endsAt: "2025-03-28" });
      const finished = (await createTask(manager, key, { ...body, columnId: done, title: "Sprint done", points: 5, sprintId: s1.id })).id;
      const open = (await createTask(manager, key, { ...body, columnId: doing, title: "Sprint open", points: 8, sprintId: s1.id })).id;

      expect(await status(completeSprint(manager, s1.id))).toBe(409); // not started yet
      await startSprint(manager, s1.id);
      expect(await status(startSprint(manager, s2.id))).toBe(409); // another is active
      expect(await status(startSprint(manager, s1.id))).toBe(409); // already active

      const result = await completeSprint(manager, s1.id);
      expect(result.state).toBe("DONE");
      expect(result.committedPoints).toBe(13);
      expect(result.completedPoints).toBe(5);
      const after = (await board()).tasks;
      expect(after.find((t) => t.id === finished)?.sprintId).toBe(s1.id);
      expect(after.find((t) => t.id === open)?.sprintId).toBeNull();

      expect(await status(updateTask(manager, open, { sprintId: s1.id }))).toBe(409); // cannot plan into a finished sprint
      await startSprint(manager, s2.id);
    });
  });

  describe("audit log and listings", () => {
    it("records who did what in plain words, once per change, and ignores no-op edits", async () => {
      const id = await make("Audited");
      const before = (await listActivity((await board()).project.id)).length;
      await updateTask(manager, id, { title: "Audited" }); // nothing changed
      expect((await listActivity((await board()).project.id)).length).toBe(before);
      await updateTask(manager, id, { points: 5, assigneeId: contributor.id });
      const feed = await listActivity((await board()).project.id);
      expect(feed[0]?.actorName).toBe(manager.name);
      expect(feed[0]?.summary).toMatch(/changed the points to 5, the assignee on/);
      expect(feed.some((e) => /created .* "Audited" in To do/.test(e.summary))).toBe(true);
    });

    it("lists projects with their counts", async () => {
      const mine = (await listProjects()).find((p) => p.key === key);
      expect(mine?.taskCount).toBeGreaterThan(5);
      expect(mine?.activeSprintName).toBe("Sprint B");
    });
  });
});
