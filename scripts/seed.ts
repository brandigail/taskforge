import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { activity, columns, projects, sprints, tasks, users } from "../db/schema";
import { POSITION_STEP } from "../lib/position";
import { completedPoints, totalPoints } from "../lib/sprint-math";
import { DEMO_PASSWORD } from "../lib/demo";
import { PEOPLE, TASKS, type ColumnKey, type PersonKey, type SprintKey } from "./seed-data";

const DAY = 86_400_000;
const daysFromNow = (days: number): Date => new Date(Date.now() + days * DAY);
const dayString = (days: number): string => daysFromNow(days).toISOString().slice(0, 10);
const at = (daysAgo: number, hour = 15): Date => {
  const d = daysFromNow(-daysAgo);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
};

/** Wipes and reseeds the demo workspace. Safe to run repeatedly. */
async function main(): Promise<void> {
  const db = getDb();
  await db.execute(sql`truncate table activity, tasks, sprints, columns, projects, users restart identity cascade`);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const people = await db
    .insert(users)
    .values(PEOPLE.map((p) => ({ name: p.name, email: `${p.key}@demo.taskforge`, passwordHash, role: p.role })))
    .returning({ id: users.id, email: users.email, name: users.name });
  const person = (key: PersonKey) => {
    const found = people.find((p) => p.email === `${key}@demo.taskforge`);
    if (!found) throw new Error(`missing ${key}`);
    return found;
  };

  const [project] = await db
    .insert(projects)
    .values({ key: "ATL", name: "Atlas web app", description: "The customer-facing web app. Two-week sprints.", ownerId: person("morgan").id, nextTaskNumber: TASKS.length + 1 })
    .returning();
  if (!project) throw new Error("project insert failed");

  const columnDefs: { key: ColumnKey; name: string; isDone: boolean }[] = [
    { key: "todo", name: "To do", isDone: false },
    { key: "doing", name: "In progress", isDone: false },
    { key: "done", name: "Done", isDone: true },
  ];
  const columnRows = await db
    .insert(columns)
    .values(columnDefs.map((c, i) => ({ projectId: project.id, name: c.name, isDone: c.isDone, position: (i + 1) * POSITION_STEP })))
    .returning({ id: columns.id, name: columns.name });
  const columnId = (key: ColumnKey) => columnRows.find((c) => c.name === columnDefs.find((d) => d.key === key)?.name)?.id ?? "";

  const sprintDefs: { key: SprintKey; name: string; goal: string; start: number; end: number; state: "DONE" | "ACTIVE" | "PLANNED" }[] = [
    { key: "s1", name: "Sprint 1", goal: "Sign-in, projects and the foundations", start: -22, end: -9, state: "DONE" },
    { key: "s2", name: "Sprint 2", goal: "A board the team can actually work on", start: -6, end: 7, state: "ACTIVE" },
    { key: "s3", name: "Sprint 3", goal: "Time tracking, comments and swimlanes", start: 8, end: 21, state: "PLANNED" },
  ];
  const sprintRows = await db
    .insert(sprints)
    .values(sprintDefs.map((s) => ({ projectId: project.id, name: s.name, goal: s.goal, startsAt: dayString(s.start), endsAt: dayString(s.end), state: s.state })))
    .returning({ id: sprints.id, name: sprints.name });
  const sprintId = (key: SprintKey) => sprintRows.find((s) => s.name === sprintDefs.find((d) => d.key === key)?.name)?.id ?? "";

  const perColumn: Record<ColumnKey, number> = { todo: 0, doing: 0, done: 0 };
  const taskValues = TASKS.map((t, i) => {
    perColumn[t.column] += 1;
    return {
      projectId: project.id,
      number: i + 1,
      columnId: columnId(t.column),
      sprintId: t.sprint ? sprintId(t.sprint) : null,
      title: t.title,
      description: t.description ?? "",
      points: t.points,
      assigneeId: t.assignee ? person(t.assignee).id : null,
      position: perColumn[t.column] * POSITION_STEP,
      trackedMinutes: t.column === "todo" ? 0 : 30 * (i % 7) + 45,
      createdBy: person("morgan").id,
      createdAt: at(24 - Math.min(i, 20)),
      completedAt: t.column === "done" ? at(t.doneDaysAgo ?? 1) : null,
    };
  });
  await db.insert(tasks).values(taskValues);

  // Snapshot the finished sprint exactly as completing it would.
  const sprint1 = TASKS.filter((t) => t.sprint === "s1").map((t) => ({ points: t.points, completedAt: t.column === "done" ? "x" : null }));
  const committed = totalPoints(sprint1) + 3; // the 3-point card that went back to the backlog
  await db.update(sprints).set({ committedPoints: committed, completedPoints: completedPoints(sprint1), completedAt: at(9) }).where(sql`${sprints.id} = ${sprintId("s1")}`);

  // A believable audit trail, newest last.
  const morgan = person("morgan").id;
  const feed: { who: string; action: string; target: string; summary: string; when: Date }[] = [
    { who: morgan, action: "project.created", target: project.id, summary: "created the project ATL: Atlas web app", when: at(25) },
    { who: morgan, action: "sprint.started", target: sprintId("s1"), summary: "started Sprint 1", when: at(22) },
    ...TASKS.flatMap((t, i) =>
      t.column === "done"
        ? [{ who: person(t.assignee ?? "morgan").id, action: "task.moved", target: `task-${i + 1}`, summary: `moved ATL-${i + 1} from In progress to Done`, when: at(t.doneDaysAgo ?? 1) }]
        : [],
    ),
    { who: morgan, action: "sprint.completed", target: sprintId("s1"), summary: `completed Sprint 1: ${completedPoints(sprint1)} of ${committed} points done, 1 unfinished card back to the backlog`, when: at(9, 17) },
    { who: morgan, action: "sprint.started", target: sprintId("s2"), summary: "started Sprint 2", when: at(6, 9) },
    { who: person("ava").id, action: "column.updated", target: columnId("done"), summary: 'marked "Done" as a done column', when: at(5) },
    { who: person("jules").id, action: "task.moved", target: "task-10", summary: "moved ATL-10 from To do to In progress", when: at(2, 10) },
    { who: person("priya").id, action: "task.moved", target: "task-11", summary: "moved ATL-11 from To do to In progress", when: at(1, 11) },
    { who: morgan, action: "sprint.created", target: sprintId("s3"), summary: `planned Sprint 3 (${dayString(8)} to ${dayString(21)})`, when: at(1, 14) },
  ];
  await db.insert(activity).values(feed.map((f) => ({ projectId: project.id, actorId: f.who, action: f.action, targetId: f.target, summary: f.summary, at: f.when })));

  console.log(`Seeded ${people.length} people, 1 project, ${columnRows.length} columns, ${sprintRows.length} sprints, ${TASKS.length} tasks, ${feed.length} activity entries.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
