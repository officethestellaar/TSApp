# TSApp Architecture & Service Topology

High-level architecture documentation for The Stellaar Club platform.

## System Topology
- **Frontend Layer**: Next.js App Router, Tailwind CSS, TanStack Query, shadcn/ui.
- **API & Business Logic**: Express / TypeScript backend running on port 5001.
- **Data Persistence**: PostgreSQL managed with Prisma ORM (multi-schema configuration).
- **Authentication**: JWT token-based session verification with role-based access control (RBAC).
