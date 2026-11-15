/** Dates are `YYYY-MM-DD`; timestamps are ISO strings. */

export type Role = "ADMIN" | "MANAGER" | "CONTRIBUTOR";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

/** What other people may see about a user: no email. */
export interface Member {
  id: string;
  name: string;
  role: Role;
}

export interface Project {
  id: string;
  key: string;
  name: string;
  description: string;
  ownerId: string;
}

export interface Column {
  id: string;
  projectId: string;
  name: string;
  position: number;
  isDone: boolean;
}

export type SprintState = "PLANNED" | "ACTIVE" | "DONE";

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal: string;
  startsAt: string;
  endsAt: string;
  state: SprintState;
  completedAt: string | null;
  committedPoints: number | null;
  completedPoints: number | null;
}

export interface Task {
  id: string;
  projectId: string;
  /** Per-project number, shown as KEY-number. */
  number: number;
  columnId: string;
  sprintId: string | null;
  title: string;
  description: string;
  points: number | null;
  assigneeId: string | null;
  position: number;
  trackedMinutes: number;
  completedAt: string | null;
}

export interface ActivityEntry {
  id: string;
  projectId: string;
  actorId: string;
  actorName: string;
  action: string;
  targetId: string;
  summary: string;
  at: string;
}

export interface BoardData {
  project: Project;
  columns: Column[];
  tasks: Task[];
  sprints: Sprint[];
  members: Member[];
}

export interface ProjectSummary extends Project {
  taskCount: number;
  doneCount: number;
  activeSprintName: string | null;
}
