# TaskForge: Project Management Workspace

Read the portfolio-root `CLAUDE.md` first for global rules. This file is the brief for this project.

## What it is
A Jira-style project workspace. Teams manage work on Kanban boards with custom columns and swimlanes, plan sprints with points and velocity charts, and every change lands in an audit feed gated by roles.

## Stack
Next.js (App Router), TypeScript strict, Tailwind CSS, Zustand, Drizzle (or Prisma) with Neon Postgres, dnd-kit, Recharts, Auth.js (credentials, argon2/bcrypt). Hosted on Netlify. No Supabase, no Vercel, no Gemini/OpenAI.

## MVP (build first)
1. Kanban board with drag-and-drop (dnd-kit), custom status columns, task create/edit drawer, optimistic updates persisted to Neon.
2. Auth.js login with roles (Admin, Manager, Contributor) enforced in server actions/route handlers, plus an activity feed (audit log) per project.
3. Sprint planning: backlog, assign tasks to a sprint, story points, start/complete sprint, burndown or velocity chart.

## Phase 2
Swimlanes (by assignee/priority), Time tracking per task, Comments and @mentions, Live board updates via short polling (2-5 s) or SSE, CSV export.

## Data model (put in `types/`)
```ts
export type Role = 'ADMIN' | 'MANAGER' | 'CONTRIBUTOR';
export interface User { id: string; email: string; name: string; role: Role }
export interface Project { id: string; key: string; name: string; ownerId: string }
export interface Column { id: string; projectId: string; name: string; position: number }
export interface Sprint { id: string; projectId: string; name: string; startsAt: string; endsAt: string; state: 'PLANNED' | 'ACTIVE' | 'DONE' }
export interface Task { id: string; projectId: string; columnId: string; sprintId: string | null; title: string; description: string; points: number | null; assigneeId: string | null; position: number; trackedMinutes: number }
export interface ActivityEntry { id: string; projectId: string; actorId: string; action: string; targetId: string; at: string }
```

## Rules specific to this project
- Enforce role checks server-side on every mutation; never trust client roles.
- Use fractional/ordered `position` values so a drag writes one row, not the whole column.
- Do not use WebSockets or Pusher. Live updates, if added, use polling/SSE.
- Seed a demo project with 3 columns, ~20 tasks, one finished and one active sprint, plus a "Try the demo" login.
- Seed realistic demo data so the app looks alive on first load without sign-up.

## Start here
1. Ask me for the Neon `DATABASE_URL`; generate `AUTH_SECRET`. Put both in `.env.local`.
2. Scaffold Next.js + Tailwind + Drizzle, commit.
3. Work through `PLAN.md` from step 2.
