# TaskForge

Project management workspace with drag-and-drop Kanban, sprint planning and role-based audit logs.

## Planned features
- Kanban board with drag-and-drop (dnd-kit), custom status columns, task create/edit drawer, optimistic updates persisted to Neon.
- Auth.js login with roles (Admin, Manager, Contributor) enforced in server actions/route handlers, plus an activity feed (audit log) per project.
- Sprint planning: backlog, assign tasks to a sprint, story points, start/complete sprint, burndown or velocity chart.

### Phase 2
- Swimlanes (by assignee/priority)
- Time tracking per task
- Comments and @mentions
- Live board updates via short polling (2-5 s) or SSE
- CSV export

## Stack
Next.js (App Router), TypeScript strict, Tailwind CSS, Zustand, Drizzle (or Prisma) with Neon Postgres, dnd-kit, Recharts, Auth.js (credentials, argon2/bcrypt), Netlify

## Live demo
Live demo: TBD

## Run locally
Run locally: TBD

## Status
Not started
