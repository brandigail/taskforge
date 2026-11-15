export type PersonKey = "ava" | "morgan" | "jules" | "priya" | "diego";
export type ColumnKey = "todo" | "doing" | "done";
export type SprintKey = "s1" | "s2" | "s3";

export interface SeedPerson {
  key: PersonKey;
  name: string;
  role: "ADMIN" | "MANAGER" | "CONTRIBUTOR";
}

export const PEOPLE: SeedPerson[] = [
  { key: "ava", name: "Ava Chen", role: "ADMIN" },
  { key: "morgan", name: "Morgan Lee", role: "MANAGER" },
  { key: "jules", name: "Jules Okafor", role: "CONTRIBUTOR" },
  { key: "priya", name: "Priya Nair", role: "CONTRIBUTOR" },
  { key: "diego", name: "Diego Alvarez", role: "CONTRIBUTOR" },
];

export interface SeedTask {
  title: string;
  description?: string;
  points: number | null;
  column: ColumnKey;
  sprint: SprintKey | null;
  assignee: PersonKey | null;
  /** For finished cards: how many days ago they were completed. */
  doneDaysAgo?: number;
}

/**
 * Sprint 1 is finished (21 points committed, 18 done; the unfinished card went back to the backlog).
 * Sprint 2 is active, a few days in. Sprint 3 is planned. The rest is the backlog.
 */
export const TASKS: SeedTask[] = [
  // Sprint 1, finished
  { title: "Set up CI pipeline", points: 5, column: "done", sprint: "s1", assignee: "diego", doneDaysAgo: 19, description: "Lint, type check and test on every pull request." },
  { title: "Design the sign-in screen", points: 3, column: "done", sprint: "s1", assignee: "priya", doneDaysAgo: 17 },
  { title: "Email and password sign-up", points: 5, column: "done", sprint: "s1", assignee: "jules", doneDaysAgo: 14, description: "Hash passwords, validate input, send the user to onboarding." },
  { title: "Project list page", points: 3, column: "done", sprint: "s1", assignee: "priya", doneDaysAgo: 12 },
  { title: "Seed data for local development", points: 2, column: "done", sprint: "s1", assignee: "diego", doneDaysAgo: 11 },
  { title: "Dark mode colour tokens", points: 3, column: "todo", sprint: null, assignee: null, description: "Carried over from Sprint 1: not started." },
  // Sprint 2, active
  { title: "Kanban board with drag and drop", points: 8, column: "done", sprint: "s2", assignee: "jules", doneDaysAgo: 3, description: "Cards move between columns and keep their order." },
  { title: "Task drawer: create and edit", points: 5, column: "done", sprint: "s2", assignee: "priya", doneDaysAgo: 2 },
  { title: "Role checks on every endpoint", points: 3, column: "done", sprint: "s2", assignee: "diego", doneDaysAgo: 1, description: "Contributors can move cards; only managers manage columns and sprints." },
  { title: "Activity feed", points: 5, column: "doing", sprint: "s2", assignee: "jules" },
  { title: "Sprint planning screen", points: 8, column: "doing", sprint: "s2", assignee: "priya", description: "Backlog on one side, sprints on the other." },
  { title: "Fix card flicker when dropping on a full column", points: 2, column: "doing", sprint: "s2", assignee: "diego" },
  { title: "Burndown chart", points: 5, column: "todo", sprint: "s2", assignee: "jules" },
  { title: "Velocity chart", points: 3, column: "todo", sprint: "s2", assignee: null },
  // Sprint 3, planned
  { title: "Time tracking on cards", points: 5, column: "todo", sprint: "s3", assignee: null },
  { title: "Comments and @mentions", points: 8, column: "todo", sprint: "s3", assignee: null },
  { title: "Swimlanes by assignee", points: 5, column: "todo", sprint: "s3", assignee: null },
  // Backlog
  { title: "Export the board to CSV", points: 3, column: "todo", sprint: null, assignee: null },
  { title: "Keyboard shortcuts for the board", points: 2, column: "todo", sprint: null, assignee: null },
  { title: "Email digest of daily activity", points: 5, column: "todo", sprint: null, assignee: null },
  { title: "Archive finished sprints", points: null, column: "todo", sprint: null, assignee: null },
  { title: "Import tasks from a spreadsheet", points: 8, column: "todo", sprint: null, assignee: null },
];
