# The Stellaar — Club Management System (V2.0)

[![Testing: Vitest](https://img.shields.io/badge/Testing-Vitest-brightgreen.svg)](https://vitest.dev/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-black.svg)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-green.svg)](https://nodejs.org/)
[![Database: Prisma & PostgreSQL](https://img.shields.io/badge/Database-Prisma%20%7C%20PostgreSQL-blue.svg)](https://www.prisma.io/)
[![Status](https://img.shields.io/badge/System%20Health-All%20Nominal-success.svg)](./STATUS.md)

**The Stellaar** is an enterprise-grade club management and estate curation platform designed for luxury clubs and private estates. It integrates member governance, family kinship management, granular permissions, multi-department invoicing, a full restaurant POS & Kitchen Display System (KDS), stock tracking, asset depreciation, concierge help desk, staff payroll, and real-time operations via Socket.IO and WhatsApp Cloud API.

---

## Table of Contents

- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Monorepo Structure](#monorepo-structure)
- [Key Features](#key-features)
- [Role-Based Access & Granular Permissions](#role-based-access--granular-permissions)
- [Real-Time Events & WebSockets](#real-time-events--websockets)
- [External Integrations](#external-integrations)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
- [Testing & Quality Standards](#testing--quality-standards)
- [Deployment Guide](#deployment-guide)
- [Project Health & Status](#project-health--status)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 16 + React 19)                 │
│  /dashboard/r/[role]  │  /member/dashboard   │  /dashboard/*            │
│  Role-Specific Views  │  Member/Family Portal│  Admin & Ops Hub         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ SocketContext (real-time targeted rooms: user_{id}, affiliate_{id})│  │
│  │ usePermission Hook (action gating by screenKey + create/read/upd) │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP (REST) + WebSockets (Socket.IO)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Backend API (Express 5 + TypeScript)                 │
│                                                                         │
│  ┌─────────────────┐   ┌───────────────────┐   ┌─────────────────────┐  │
│  │ 24 Route Hubs   │   │ Security / Shield │   │ Services & Lib      │  │
│  │ /api/members    │   │ JWT Verification  │   │ automation.ts       │  │
│  │ /api/billing    │   │ RBAC Middleware   │   │ backup.ts (snapshot)│  │
│  │ /api/restaurant │   │ Auth Rate Limiter │   │ sync.ts (cloud-sync)│  │
│  │ /api/users      │   │ Screen Permissions│   │ whatsapp.ts         │  │
│  │ /api/access ... │   │ x-test-bypass     │   │ socket.ts / push.ts │  │
│  └─────────────────┘   └───────────────────┘   └─────────────────────┘  │
└──────────┬─────────────────────────┬─────────────────────────┬──────────┘
           │ Prisma ORM              │ Prisma Local Client     │ Prisma Ledger
           ▼                         ▼                         ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
│ Primary Cloud Database│ │ Local SQLite Replica  │ │ Secondary Ledger DB   │
│ PostgreSQL (Supabase) │ │ local.prisma          │ │ ledger.prisma         │
│ 45+ Production Tables │ │ Offline Fault Buffer  │ │ Immutable Trans. Logs │
└───────────────────────┘ └───────────────────────┘ └───────────────────────┘
```

---

## Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend** | [Next.js 16](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/), [Recharts](https://recharts.org/), [Lucide React](https://lucide.dev/), [Axios](https://axios-http.com/) |
| **Backend** | [Node.js](https://nodejs.org/) (v20+), [Express 5](https://expressjs.com/), [TypeScript 5](https://www.typescriptlang.org/), [tsx](https://github.com/privatenumber/tsx) |
| **Databases** | **Primary:** PostgreSQL 14+ ([Supabase](https://supabase.com/) with PgBouncer)<br>**Offline Sync:** Local SQLite (`prisma/local.prisma`)<br>**Financial Audit:** Transaction Ledger SQLite (`prisma/ledger.prisma`) |
| **ORM** | [Prisma ORM](https://www.prisma.io/) (v5.22, multi-schema & multiple client targets) |
| **Real-time** | [Socket.IO](https://socket.io/) (rooms for user-specific alerts & broadcasts) |
| **Messaging & Alerts** | [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api) (Meta Graph v22.0), [Nodemailer](https://nodemailer.com/) (Gmail SMTP), [Expo Push](https://expo.dev/) |
| **Testing** | [Vitest](https://vitest.dev/), [Supertest](https://github.com/ladjs/supertest) |
| **Code Quality** | ESLint (strict 0 errors, 0 warnings policy) |

---

## Monorepo Structure

```
TSApp/
├── frontend/                         # Next.js 16 application
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/            # Administrative & staff dashboard
│   │   │   │   ├── members/          # Member directory, profiles, status modals
│   │   │   │   ├── billing/          # Invoices, settlements, payment approvals
│   │   │   │   ├── restaurant/       # POS, interactive table layout, KDS
│   │   │   │   ├── inventory/        # Stock levels, adjustments, low-stock flags
│   │   │   │   ├── assets/           # Equipment tracking, maintenance, scrap
│   │   │   │   ├── requests/         # Centralized member requests management
│   │   │   │   ├── concierge/        # Real-time help desk & member ticketing
│   │   │   │   └── r/[role]/         # Dedicated dashboard views per staff role
│   │   │   ├── member/               # Member & Family Affiliate portal
│   │   │   ├── login/                # Authentication routes
│   │   │   └── layout.tsx            # Global HTML layout & styling
│   │   ├── components/               # Modals, UI widgets, navigation bars
│   │   ├── context/                  # AuthContext, SocketContext
│   │   └── lib/                      # Axios API client, formatting utilities
│   └── package.json
├── backend/                          # Express TypeScript API server
│   ├── src/
│   │   ├── index.ts                  # Server entry point, middleware, lifecycle
│   │   ├── routes/                   # 24 modular route controllers
│   │   ├── middleware/               # auth.ts (JWT verify, RBAC, screen permissions)
│   │   ├── services/
│   │   │   ├── automation.ts         # Automated cron tasks & renewal checks
│   │   │   ├── backup.ts             # Snapshot backup generator & manifest
│   │   │   └── sync.ts               # Autonomous cloud-to-local registry sync
│   │   └── lib/                      # Prisma, Socket.IO, WhatsApp, Push, Audit
│   ├── prisma/
│   │   ├── schema.prisma             # Primary PostgreSQL schema (45+ models)
│   │   ├── local.prisma              # Local SQLite replica schema
│   │   ├── ledger.prisma             # Transaction ledger schema
│   │   └── seed.ts                   # Seed script for roles, admin & test data
│   ├── vitest.config.ts              # Vitest backend configuration
│   └── package.json
├── STATUS.md                         # Detailed project status & change journal
├── package.json                      # Workspace configuration
└── start.sh                          # One-command dual-server launcher
```

---

## Key Features

### 1. Member & Family Affiliate Governance
- **4-Step Member Registration:** Comprehensive onboarding capturing personal details, residential addresses, Aadhaar documents, and initial payment verification.
- **SuperAdmin Membership Lifecycle Control:** Direct SuperAdmin/Admin override across all valid lifecycle states (`APPROVED`, `ACTIVE`, `PENDING`, `SUSPENDED`, `EXPIRED`, `INACTIVE`, `TERMINATED`, `REJECTED`) with automated synchronization of `accessStatus` (`ENABLED`/`DISABLED`).
- **AMC Waiver vs Gold Billing:** Automatic AMC waiver logic for Blue tier members upon registration; Gold tier retains active AMC status.
- **Instant AMC Settle & Bill Generation:** One-click SuperAdmin settlement of unpaid AMC dues via `PATCH /api/members/:id/amc-status`, automatically creating an official paid invoice (`department: 'AMC'`, format `AMC-YYYY-XXXX`), 18% GST calculation, receipt number, and ledger journal entry.
- **Family Affiliate Protocol:** Enforces a strict capacity limit of 3 family affiliates per primary member (4 total account capacity). Suffix ID logic assigns `-1` to the primary member and `-2` through `-4` to affiliates.
- **Bifurcated Member Portal:** Dedicated views for family affiliates showing their individual QR cards, personal reservations, and orders, while isolating financial accounts to the primary member.
- **Self-Service Identity Node:** Members can self-edit non-sensitive personal details (occupation, blood group, spouse/father name) directly from their portal.

### 2. Granular Screen Permissions System
- Built-in `UserScreenAccess` schema providing per-user, per-screen permissions (`canCreate`, `canRead`, `canUpdate`, `canDelete`).
- Supported screens include: `members`, `billing`, `inventory`, `restaurant`, `assets`, `concierge`, `announcements`, `reports`, `access`, `staff`, `requests`, and `salary`.
- Frontend `usePermission` hook seamlessly gates action buttons and links.
- Unrestricted bypass for `SUPER_ADMIN` accounts.

### 3. Administrative Requests Hub (`/dashboard/requests`)
- Unified command center for administrative personnel to review, approve, or reject pending estate requests:
  - Family affiliate enrollment applications.
  - Table dining reservations and cancellations.
  - Member unenrollment / departure requests.

### 4. Billing, Invoicing & Financial Ledger
- Multi-department billing covering: Restaurant Dining, Salon, Gymnasium, Swimming Pool, Banquet Hall, and Personal Training.
- Walk-in guest billing support with mobile phone and Aadhaar capture.
- Automated GST computation (18%) and real-time running ledger balances.
- Two-stage payment approval workflow (`PENDING_APPROVAL` → `PAID`).
- Instant payment receipts sent via WhatsApp Cloud API.

### 5. Restaurant POS & Kitchen Display System (KDS)
- Interactive floor plans with dynamic table statuses (`AVAILABLE`, `OCCUPIED`, `RESERVED`).
- Kitchen Order Ticket (KOT) generation and automated dispatch.
- Real-time Kitchen Display System tracking order statuses (`PENDING` → `PREPARING` → `READY` → `SERVED`).
- Direct bill generation with table release and automatic recipe ingredient deduction from inventory.

### 6. Inventory & Asset Management
- Real-time stock registry with automated minimum threshold warnings and low-stock alerts.
- Asset lifecycle tracking with straight-line depreciation calculations, maintenance schedules, and scrap approvals.

### 7. Concierge & Help Desk
- Priority-tagged ticketing system with status updates (`OPEN`, `IN_PROGRESS`, `RESOLVED`).
- Live two-way WebSocket chat between members and staff.

### 8. Security & Surgical Rate Limiting
- Real-time access logging with QR scanning and biometric integration.
- Selective Authentication Vector Rate Limiter: throttles `/api/auth` to 25 requests per 5 minutes to prevent brute-force attacks, while keeping operational endpoints (`/api/system`, `/health`, etc.) 100% open. Supports `x-test-bypass: true` header for automated verification suites.

### 9. Multi-Database Resilience & Local Backup
- **Autonomous Sync Engine:** Automatic background synchronization between Supabase Cloud and local SQLite registry on startup and lifecycle triggers.
- **Snapshot Generator:** Automated snapshot engine creating tar/compressed snapshots of database states with manifest tracking.

---

## Role-Based Access & Granular Permissions

| Page / Vector | SUPER_ADMIN | ADMIN | CLUB_MANAGER | ACCOUNTANT | F&B / CHEF | SECURITY | HOUSEKEEPING |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **System Dashboard** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Member Governance** | ✅ | ✅ | ✅ | ✅ | — | — | — |
| **Billing & Invoices** | ✅ | ✅ | ✅ | ✅ | — | — | — |
| **Requests Hub** | ✅ | ✅ | ✅ | — | — | — | — |
| **Restaurant POS & KDS** | ✅ | ✅ | ✅ | — | ✅ | — | — |
| **Inventory Tracking** | ✅ | ✅ | ✅ | — | ✅ | — | — |
| **Asset Register** | ✅ | ✅ | ✅ | — | — | — | — |
| **Estate Activities** | ✅ | ✅ | ✅ | — | — | — | — |
| **Concierge Tickets** | ✅ | ✅ | ✅ | — | — | — | — |
| **Access Gate Logs** | ✅ | ✅ | ✅ | — | — | ✅ | — |
| **Staff & Payroll** | ✅ | ✅ | ✅ | — | — | — | — |
| **Audit Logs** | ✅ | — | — | — | — | — | — |

*All non-admin mutations are further filtered through `UserScreenAccess` records.*

---

## Real-Time Events & WebSockets

The system leverages Socket.IO with both broadcast channels and private user rooms (`user_{id}`, `affiliate_{id}`):

| Event | Origin / Trigger | Recipient Target | Frontend Toast |
| :--- | :--- | :--- | :---: |
| `new_invoice` | Invoice generated in any department | Staff Room / Member | ✅ |
| `payment_confirmed` | Payment approved by accountant | Private Member Room | ✅ |
| `new_kot` | Waiter dispatches kitchen order | Kitchen / Chef Room | ✅ |
| `order_status_update` | Item status advanced in KDS | Waiter / POS Terminals | ✅ |
| `new_announcement` | Admin broadcasts estate notice | All Connected Clients | ✅ |
| `new_message` | Chat sent in Concierge ticket | Specific Member / Staff | ✅ |
| `low_stock_alert` | Stock quantity drops below reorder point | Store Manager / Admin | ✅ |
| `new_access_log` | Member checks in at gate | Security / Gate Staff | ✅ |
| `activity_update` | Estate event published / updated | All Members | ✅ |

---

## External Integrations

### WhatsApp Cloud API (Meta)
Automated payment receipts and balance notifications are dispatched when transactions are verified.
```env
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_permanent_access_token
WHATSAPP_API_VERSION=v22.0
```

### Nodemailer (Gmail SMTP)
Used for automated member onboarding emails, password recovery, and event announcements.
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=office@stellaar.com
SMTP_PASS=your_app_password
SMTP_SECURE=true
```

---

## API Reference

The backend provides 24 modular route controllers mounted at `/api/`:

| Base Path | Primary Controller | Functionality |
| :--- | :--- | :--- |
| `/api/auth` | `auth.ts` | Login, password reset, token validation |
| `/api/users` | `user.ts` | Staff accounts, roles, screen permission matrices |
| `/api/members` | `member.ts` | Member directory, KYC, family affiliates, status & AMC controls |
| `/api/billing` | `billing.ts` | Department invoices, payment settlement, running ledger |
| `/api/restaurant` | `restaurant.ts` | Table layouts, dining orders, KOT generation, KDS status |
| `/api/menu` | `menu.ts` | Menu item categories, pricing, veg/non-veg modifiers |
| `/api/inventory` | `inventory.ts` | Stock quantities, recipe associations, reorder logs |
| `/api/assets` | `asset.ts` | Equipment inventory, maintenance schedules, depreciation |
| `/api/complaints` | `complaint.ts` | Concierge tickets, two-way live messaging |
| `/api/access` | `access.ts` | Gate entry logging, QR card validation, blacklists |
| `/api/activities` | `activity.ts` | Estate events, booking quotas, attendee rosters |
| `/api/announcements`| `announcement.ts` | Broadcast announcements & notifications |
| `/api/reports` | `reports.ts` | Financial charts, revenue summaries, member growth |
| `/api/audit` | `audit.ts` | Tamper-evident administrative audit logs |
| `/api/amc` | `amc.ts` | Annual maintenance charge approvals and requests |
| `/api/init` | `init.ts` | System bootstrap and initialization checks |
| `/api/system` | `system.ts` | Lock status, operational health, traffic testing |
| `/api/leave` | `leave.ts` | Staff leave requests and management |
| `/api/push` | `push.ts` | Mobile push notification registry |
| `/api/walkin-guests` | `walkin-guests.ts`| Walk-in patron registration and tracking |
| `/api/housekeeping` | `housekeeping.ts`| Floor and room cleaning checklists |
| `/api/attendance` | `attendance.ts` | Daily staff attendance logs |
| `/api/salary` | `salary.ts` | Payroll generation, bonus/deduction records |
| `/api/export-requests`| `export-requests.ts`| Audit export generation and tracking |

---

## Getting Started

### Prerequisites
- **Node.js:** v20.0.0 or higher
- **PostgreSQL:** v14+ (local instance on port 5432 or Supabase cloud instance)
- **npm:** v10+

### 1. Installation
Clone the repository and install workspace dependencies:
```bash
git clone https://github.com/officethestellaar/TSApp.git
cd TSApp
npm install
```

### 2. Environment Configuration
Configure `backend/.env` (refer to `backend/.env.example`):
```env
PORT=5001
DATABASE_URL="postgresql://user:pass@host:5432/postgres?connection_limit=5"
DIRECT_URL="postgresql://user:pass@host:5432/postgres"
JWT_SECRET="your-secure-jwt-secret"
FRONTEND_URL="http://localhost:3000"
```

Configure `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL="http://localhost:5001/api/"
```

### 3. Database Generation & Seeding
```bash
cd backend
npx prisma generate
npx prisma generate --schema=prisma/local.prisma
npx prisma generate --schema=prisma/ledger.prisma
npx prisma db push
npm run prisma:seed
cd ..
```

### 4. Launch Development Servers
Launch both frontend and backend concurrently:
```bash
./start.sh
```
Or run individually via npm workspaces:
```bash
# Terminal 1 - Backend (Port 5001)
npm run dev:backend

# Terminal 2 - Frontend (Port 3000)
npm run dev:frontend
```

### 5. Default Administrative Credentials
- **URL:** [http://localhost:3000/login](http://localhost:3000/login)
- **SuperAdmin Email:** `admin@stellaar.com`
- **Password:** `admin123`

---

## Testing & Quality Standards

The project adheres to strict automated testing and zero-warning linting standards:

```bash
# Run all automated tests across frontend and backend
npm run test

# Run backend Vitest tests only
npm run test -w backend

# Run frontend Vitest tests only
npm run test -w frontend

# Run strict ESLint verification (0 errors, 0 warnings enforced)
npm run lint

# Validate Prisma database schemas
cd backend
npx prisma validate
npx prisma validate --schema=prisma/local.prisma
npx prisma validate --schema=prisma/ledger.prisma
cd ..

# Verify backend TypeScript compilation
cd backend && npx tsc --noEmit && cd ..
```

---

## Deployment Guide

The platform is designed to deploy cleanly with separate frontend and backend instances:

### Backend Deployment (Render / Railway / VPS)
- **Root Directory:** `backend`
- **Build Command:** `npm install && npx prisma generate && npx prisma generate --schema=prisma/local.prisma && npx prisma generate --schema=prisma/ledger.prisma && tsc && cp -r src/generated dist/generated`
- **Start Command:** `npm run start`
- **Port:** `5001` (or dynamic `PORT`)
- Configure database connection pooler (`pgbouncer=true` on port `6543` for Supabase).

### Frontend Deployment (Vercel)
- **Root Directory:** `frontend`
- **Framework Preset:** Next.js
- **Environment Variable:** `NEXT_PUBLIC_API_URL=https://your-backend-api.com/api/`

---

## Project Health & Status

For a chronological journal of system enhancements, architectural upgrades, and verification results, consult [`STATUS.md`](./STATUS.md).

- **Current Status:** ✅ **ALL SYSTEMS NOMINAL / FULLY TESTED / BACKEND VERIFIED**
- **Automated Tests:** 30 / 30 tests passing (100% pass rate)
- **Frontend Linter:** 0 errors, 0 warnings

---

## License

Proprietary — **The Stellaar Club**. All rights reserved.
