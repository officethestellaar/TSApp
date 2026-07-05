# Project Instructions

## Workflows
- **Status Reporting:** Maintain and update `STATUS.md` in the project root after EVERY change. Each update MUST include the specific date and time of the change, a detailed description of what was modified, and the resulting system health.
- **Runtime Monitoring:** When asked to run the system, monitor terminal output for runtime errors and resolve them immediately.

## Technical Standards
- **Testing:** Use Vitest for all automated tests. Ensure `npm run test` passes before finalizing changes.
- **Linting:** Maintain clean linting in the frontend (0 errors, 0 warnings).
- **Database:** Use Prisma for all database operations. Ensure the local PostgreSQL service (v14+) is running on port 5432.
