import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["ADMIN", "MANAGER", "CONTRIBUTOR"]);
export const sprintStateEnum = pgEnum("sprint_state", ["PLANNED", "ACTIVE", "DONE"]);

const id = () => uuid("id").primaryKey().default(sql`gen_random_uuid()`);
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("CONTRIBUTOR"),
  createdAt: createdAt(),
});

export const projects = pgTable("projects", {
  id: id(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id),
  /** Counter behind task numbers such as ATL-12. Bumped atomically when a task is created. */
  nextTaskNumber: integer("next_task_number").notNull().default(1),
  createdAt: createdAt(),
});

export const columns = pgTable(
  "columns",
  {
    id: id(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Fractional so a drag or insert writes one row instead of renumbering the board. */
    position: doublePrecision("position").notNull(),
    /** Tasks that land here count as finished for burndown and velocity. */
    isDone: boolean("is_done").notNull().default(false),
  },
  (t) => [index("columns_project_idx").on(t.projectId, t.position)],
);

export const sprints = pgTable(
  "sprints",
  {
    id: id(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    goal: text("goal").notNull().default(""),
    startsAt: date("starts_at").notNull(),
    endsAt: date("ends_at").notNull(),
    state: sprintStateEnum("state").notNull().default("PLANNED"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    /** Snapshots taken when the sprint is completed, so velocity survives unfinished work moving back to the backlog. */
    committedPoints: integer("committed_points"),
    completedPoints: integer("completed_points"),
    createdAt: createdAt(),
  },
  (t) => [index("sprints_project_idx").on(t.projectId)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: id(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    columnId: uuid("column_id")
      .notNull()
      .references(() => columns.id),
    sprintId: uuid("sprint_id").references(() => sprints.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    points: integer("points"),
    assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
    position: doublePrecision("position").notNull(),
    trackedMinutes: integer("tracked_minutes").notNull().default(0),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    /** Set when the task enters a done column, cleared when it leaves. Drives the burndown. */
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    unique().on(t.projectId, t.number),
    index("tasks_column_idx").on(t.columnId, t.position),
    index("tasks_sprint_idx").on(t.sprintId),
  ],
);

export const activity = pgTable(
  "activity",
  {
    id: id(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    targetId: text("target_id").notNull(),
    summary: text("summary").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("activity_project_idx").on(t.projectId, t.at)],
);
