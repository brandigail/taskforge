import { asc, eq, sql } from "drizzle-orm";
import type { z } from "zod";
import { getDb } from "@/db";
import { columns, projects, sprints, tasks, users } from "@/db/schema";
import { POSITION_STEP } from "@/lib/position";
import type { createProjectSchema } from "@/lib/schemas";
import type { BoardData, Project, ProjectSummary } from "@/types";
import { logActivity } from "./activity";
import { ApiError, assertCan, projectByKey, type Actor } from "./guard";
import { toColumn, toMember, toProject, toSprint, toTask } from "./mappers";

const DEFAULT_COLUMNS = [
  { name: "To do", isDone: false },
  { name: "In progress", isDone: false },
  { name: "Done", isDone: true },
];

export async function createProject(actor: Actor, input: z.infer<typeof createProjectSchema>): Promise<Project> {
  assertCan(actor, "project:create");
  const db = getDb();
  const [clash] = await db.select({ id: projects.id }).from(projects).where(eq(projects.key, input.key)).limit(1);
  if (clash) throw new ApiError(409, `The key ${input.key} is already used by another project`);

  const [created] = await db.insert(projects).values({ ...input, ownerId: actor.id }).returning();
  if (!created) throw new ApiError(500, "Could not create the project");
  await db.insert(columns).values(DEFAULT_COLUMNS.map((c, i) => ({ projectId: created.id, name: c.name, isDone: c.isDone, position: (i + 1) * POSITION_STEP })));
  await logActivity({ projectId: created.id, actor, action: "project.created", targetId: created.id, summary: `created the project ${created.key}: ${created.name}` });
  return toProject(created);
}

export async function deleteProject(actor: Actor, projectKey: string): Promise<void> {
  assertCan(actor, "project:delete");
  const project = await projectByKey(projectKey);
  // Tasks reference columns without a cascade, so clear them first.
  await getDb().delete(tasks).where(eq(tasks.projectId, project.id));
  await getDb().delete(projects).where(eq(projects.id, project.id));
}

interface SummaryRow extends Record<string, unknown> {
  id: string;
  key: string;
  name: string;
  description: string;
  ownerId: string;
  taskCount: number;
  doneCount: number;
  activeSprintName: string | null;
}

/**
 * Written as plain SQL with aliases on purpose: Drizzle drops table qualifiers inside `sql` fragments of a
 * single-table select, which turns these correlated subqueries into comparisons of a table with itself.
 */
export async function listProjects(): Promise<ProjectSummary[]> {
  const result = await getDb().execute<SummaryRow>(sql`
    select p.id, p.key, p.name, p.description, p.owner_id as "ownerId",
      (select count(*)::int from tasks t where t.project_id = p.id) as "taskCount",
      (select count(*)::int from tasks t where t.project_id = p.id and t.completed_at is not null) as "doneCount",
      (select s.name from sprints s where s.project_id = p.id and s.state = 'ACTIVE' limit 1) as "activeSprintName"
    from projects p
    order by p.name`);
  return result.rows;
}

/** Everything a board, backlog or report screen needs, in one load. */
export async function loadBoard(projectKey: string): Promise<BoardData> {
  const project = await projectByKey(projectKey);
  const db = getDb();
  const [columnRows, taskRows, sprintRows, memberRows] = await Promise.all([
    db.select().from(columns).where(eq(columns.projectId, project.id)).orderBy(asc(columns.position)),
    db.select().from(tasks).where(eq(tasks.projectId, project.id)).orderBy(asc(tasks.position)),
    db.select().from(sprints).where(eq(sprints.projectId, project.id)).orderBy(asc(sprints.startsAt)),
    db.select({ id: users.id, name: users.name, role: users.role }).from(users).orderBy(asc(users.name)),
  ]);
  return {
    project: toProject(project),
    columns: columnRows.map(toColumn),
    tasks: taskRows.map(toTask),
    sprints: sprintRows.map(toSprint),
    members: memberRows.map(toMember),
  };
}
