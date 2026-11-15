# TaskForge: Build Plan

- [x] 1. Scaffold the project (stack in `CLAUDE.md`), strict `tsconfig`, lint, `netlify.toml`, `.env.example`; first working commit
- [x] 2. Neon schema (users, projects, columns, sprints, tasks, activity) and migration
- [x] 3. `types/` interfaces and zod schemas
- [x] 4. Auth.js credentials login, password hashing, role helpers
- [x] 5. Projects list and create project
- [x] 6. Kanban board UI with dnd-kit and column management
- [x] 7. Task drawer: create, edit, assign, points
- [x] 8. Persist drag-and-drop with ordered positions and optimistic updates
- [x] 9. Activity feed written from a single server helper
- [x] 10. Backlog and sprint planning (assign, start, complete)
- [x] 11. Velocity/burndown chart with Recharts
- [x] 12. Role-gated UI and server checks
- [x] 13. Seed script and "Try the demo" login
- [x] 14. Quality gate: `npm run build`, lint and `tsc --noEmit` all pass; no console errors; core flow tested at 375px and desktop (12 unit tests, 14 integration tests, automated browser run with 37 checks)
- [x] 15. README: pitch, features, stack, architecture notes, screenshot placeholders, run steps, 3-bullet "what to demo to a recruiter", Phase 2 list
- [ ] 16. Deploy to Netlify, set env vars, verify the public URL end to end (deferred: deploys happen together after every project is built)
- [x] 17. Push to GitHub (live URL in `README.md` and root `LINKS.md` stays TBD until step 16)
