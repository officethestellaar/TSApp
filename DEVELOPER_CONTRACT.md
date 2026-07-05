# Developer Contract — The Stellaar Club Management System

---

## 1. Parties

**Developer:** Mohammed Areeb Ali Shivji  
**Project:** The Stellaar — Club Management System (TSwebapp)  
**Effective Date:** July 1, 2026

---

## 2. Scope of Work

The Developer has designed, built, and delivered a full-stack club management platform ("The Stellaar") comprising:

- **Backend:** Express.js API with PostgreSQL (Supabase), Prisma ORM, Socket.io real-time engine, JWT-based authentication, role-based access control (RBAC), rate limiting, Helmet security headers, automated backup/sync, and scheduled jobs.
- **Frontend:** Next.js 16 dashboard with role-aware sidebar, screen-level permissions, attendance PIN check-in/check-out, member self-service portal, real-time WebSocket updates, and responsive Tailwind CSS UI.
- **Database:** Multi-schema architecture (auth + public), cloud PostgreSQL with local SQLite shadow registries for redundancy.
- **Security:** bcrypt password hashing, JWT token auth, express-rate-limit, Helmet, account locking, RBAC with 16 roles and 27 screen-level permissions, emergency network lock protocol.
- **Infrastructure:** Monorepo with npm workspaces, automated test suite (Vitest), TypeScript strict mode, ESLint, production build pipeline.

---

## 3. Intellectual Property

All source code, database schemas, API designs, UI/UX components, documentation, and architectural decisions within the `TSwebapp` repository are the intellectual property of **The Stellaar** and **Mohammed Areeb Ali Shivji** as the sole developer.

The Developer grants The Stellaar a perpetual, royalty-free license to use, modify, and operate the software for its internal business purposes.

---

## 4. Development Standards

- **Testing:** All security and process tests pass (7 backend + 4 frontend + full 8-stage suite).
- **Type Safety:** TypeScript strict mode across backend and frontend.
- **Linting:** ESLint passes with zero errors.
- **Build:** Production build compiles successfully via `next build`.
- **Security:** 401/403 protection on all sensitive endpoints, rate limiting on auth routes, RBAC enforced at middleware level, no secrets committed.

---

## 5. Post-Delivery Roadmap

The following features are planned for future development phases:

| Phase | Feature | Description |
|-------|---------|-------------|
| Phase 1 | **Biometric Fingerprint Attendance** | Integrate biometric scanner hardware for staff check-in/check-out via the existing `/api/access/webhook` endpoint. Map biometric IDs to staff user records. |
| Phase 2 | **Visitor Entry/Exit Logs** | Maintain a searchable log of all persons entering and leaving the estate (members, guests, staff, vendors) with timestamps, purpose, and cyber compliance metadata. |
| Phase 3 | **Cyber Norms Compliance** | Implement audit trails compliant with ISO 27001 standards, data retention policies, access logging with IP/device details, and automated anomaly detection. |
| Phase 4 | **Advanced Reporting** | BI dashboards for membership trends, revenue analytics, staff productivity, and security audit summaries. |

---

## 6. Liability & Maintenance

The software is delivered "as-is" with best-effort security hardening. The Developer is not liable for:
- Data loss due to improper deployment or configuration
- Third-party service outages (Supabase, hosting provider)
- Damages arising from unauthorized access through compromised credentials

Maintenance and support beyond the delivery date are subject to a separate agreement.

---

## 7. Acceptance

By deploying and operating this system, The Stellaar acknowledges receipt and acceptance of the delivered work.

---

**Developer Signature:**  
_Mohammed Areeb Ali Shivji_  
Date: July 1, 2026

---

**Client Signature:**  
_________________________  
Date: _______________
