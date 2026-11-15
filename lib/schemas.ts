import { z } from "zod";

export const POINT_OPTIONS = [1, 2, 3, 5, 8, 13] as const;

export const loginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
});

export const createProjectSchema = z.object({
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9]{1,4}$/, "Use 2 to 5 letters or digits, starting with a letter"),
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).default(""),
});

export const createColumnSchema = z.object({
  name: z.string().trim().min(1).max(30),
  isDone: z.boolean().default(false),
});

export const updateColumnSchema = z.object({
  name: z.string().trim().min(1).max(30).optional(),
  isDone: z.boolean().optional(),
});

const points = z.number().int().refine((n) => (POINT_OPTIONS as readonly number[]).includes(n), "Pick a size from 1, 2, 3, 5, 8 or 13");

export const createTaskSchema = z.object({
  columnId: z.uuid(),
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(4000).default(""),
  points: points.nullable().default(null),
  assigneeId: z.uuid().nullable().default(null),
  sprintId: z.uuid().nullable().default(null),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(140).optional(),
  description: z.string().trim().max(4000).optional(),
  points: points.nullable().optional(),
  assigneeId: z.uuid().nullable().optional(),
  sprintId: z.uuid().nullable().optional(),
  trackedMinutes: z.number().int().min(0).max(100_000).optional(),
});

/** A move names the destination and the neighbours the card was dropped between. The server computes the position. */
export const moveTaskSchema = z.object({
  columnId: z.uuid(),
  aboveId: z.uuid().nullable().default(null),
  belowId: z.uuid().nullable().default(null),
});

export const createSprintSchema = z
  .object({
    name: z.string().trim().min(1).max(40),
    goal: z.string().trim().max(200).default(""),
    startsAt: z.iso.date(),
    endsAt: z.iso.date(),
  })
  .refine((s) => s.endsAt >= s.startsAt, { message: "The end date must not be before the start date", path: ["endsAt"] });
