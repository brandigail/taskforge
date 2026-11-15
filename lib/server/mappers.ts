import type { activity, columns, projects, sprints, tasks, users } from "@/db/schema";
import type { Column, Member, Project, Sprint, Task } from "@/types";

export const toProject = (p: typeof projects.$inferSelect): Project => ({
  id: p.id,
  key: p.key,
  name: p.name,
  description: p.description,
  ownerId: p.ownerId,
});

export const toColumn = (c: typeof columns.$inferSelect): Column => ({
  id: c.id,
  projectId: c.projectId,
  name: c.name,
  position: c.position,
  isDone: c.isDone,
});

export const toSprint = (s: typeof sprints.$inferSelect): Sprint => ({
  id: s.id,
  projectId: s.projectId,
  name: s.name,
  goal: s.goal,
  startsAt: s.startsAt,
  endsAt: s.endsAt,
  state: s.state,
  completedAt: s.completedAt?.toISOString() ?? null,
  committedPoints: s.committedPoints,
  completedPoints: s.completedPoints,
});

export const toTask = (t: typeof tasks.$inferSelect): Task => ({
  id: t.id,
  projectId: t.projectId,
  number: t.number,
  columnId: t.columnId,
  sprintId: t.sprintId,
  title: t.title,
  description: t.description,
  points: t.points,
  assigneeId: t.assigneeId,
  position: t.position,
  trackedMinutes: t.trackedMinutes,
  completedAt: t.completedAt?.toISOString() ?? null,
});

export const toMember = (u: Pick<typeof users.$inferSelect, "id" | "name" | "role">): Member => ({ id: u.id, name: u.name, role: u.role });

export type ActivityRow = typeof activity.$inferSelect;
