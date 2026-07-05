# The Stellaar — Club Management System

A full-featured web app for managing club members, billing, restaurant POS, inventory, staff, access control, and estate operations with real-time notifications and WhatsApp messaging.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (Next.js 16)             │
│  /dashboard/r/[role]  │  /member  │  /dashboard/*   │
│  Role-based views     │  Member   │  Admin pages    │
│                       │  portal   │                 │
│  ┌───────────────────────────────────────────────┐  │
│  │  SocketContext (real-time notifications)      │  │
│  │  usePermission (action gating by role+screen) │  │
│  └───────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP + WebSocket
                       ▼
┌─────────────────────────────────────────────────────┐
│              Backend (Express + TypeScript)          │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  Routes   │  │  Auth MW  │  │  Lib (services)   │  │
│  │ 24 routes │  │  JWT +   │  │  email.ts         │  │
│  │          │  │  RBAC    │  │  whatsapp.ts       │  │
│  │          │  │          │  │  socket.ts         │  │
│  │          │  │          │  │  push.ts           │  │
│  │          │  │          │  │  audit.ts          │  │
│  │          │  │          │  │  cache.ts          │  │
│  │          │  │          │  │  ledger.ts         │  │
│  │          │  │          │  │  prisma.ts         │  │
│  └──────────┘  └──────────┘  └───────────────────┘  │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │  Socket.IO Server (real-time events)          │  │
│  │  Events: new_invoice, payment_confirmed,      │  │
│  │  new_kot, new_announcement, new_message,      │  │
│  │  low_stock_alert, new_access_log, etc.        │  │
│  └───────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │ Prisma ORM
                       ▼
┌─────────────────────────────────────────────────────┐
│           PostgreSQL (via Supabase)                  │
│  ~45 tables: Member, Invoice, Payment, Inventory,    │
│  Staff, Complaint, Message, AuditLog, Activity,      │
│  Announcement, AccessLog, Housekeeping, etc.         │
└─────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer      | Technology                                      |
| ---------- | ----------------------------------------------- |
| Frontend   | Next.js 16, React 19, Tailwind CSS 4, Recharts  |
| Backend    | Node.js, Express 5, TypeScript                  |
| Database   | PostgreSQL 14+ (via Supabase)                   |
| ORM        | Prisma                                          |
| Auth       | JWT + Role-Based Access Control (RBAC)          |
| Real-time  | Socket.IO                                       |
| Payments   | WhatsApp Cloud API (Meta)                       |
| Email      | Nodemailer (Gmail SMTP)                         |
| Push       | Expo Push Notifications                        |
| Testing    | Vitest, Supertest                               |

---

## Folder Structure

```
TSwebapp/
├── frontend/                    # Next.js 16 app
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/       # Staff/admin dashboard
│   │   │   │   └── r/[role]/    # Role-specific dashboards
│   │   │   ├── member/          # Member portal
│   │   │   ├── login/           # Auth pages
│   │   │   └── layout.tsx       # Root layout
│   │   ├── components/
│   │   │   ├── layout/          # Sidebar, Navbar
│   │   │   ├── ui/              # Reusable UI primitives
│   │   │   └── dashboard/       # Dashboard widgets
│   │   ├── context/
│   │   │   ├── AuthContext.tsx   # Auth state + JWT
│   │   │   └── SocketContext.tsx # Real-time notifications
│   │   ├── hooks/               # usePermission, etc.
│   │   ├── lib/                 # API client, helpers
│   │   └── types/               # TypeScript interfaces
│   └── tailwind.config.ts
├── backend/                     # Express API server
│   ├── src/
│   │   ├── index.ts             # Server entry
│   │   ├── routes/              # 24 route modules
│   │   │   ├── auth.ts          # Login, reset password
│   │   │   ├── billing.ts       # Invoices, payments, approval
│   │   │   ├── member.ts        # CRUD + import
│   │   │   ├── menu.ts          # Menu + categories
│   │   │   ├── restaurant.ts    # POS, KOT, orders
│   │   │   ├── inventory.ts     # Stock, usage
│   │   │   ├── asset.ts         # Asset lifecycle
│   │   │   ├── complaint.ts     # Help desk tickets
│   │   │   ├── access.ts        # Entry logs
│   │   │   ├── audit.ts         # Audit log viewer
│   │   │   ├── reports.ts       # Charts, feedback
│   │   │   └── ... (12 more)
│   │   ├── middleware/
│   │   │   └── auth.ts          # JWT verify + RBAC
│   │   ├── lib/
│   │   │   ├── prisma.ts        # DB client
│   │   │   ├── socket.ts        # Socket.IO server
│   │   │   ├── email.ts         # Nodemailer
│   │   │   ├── whatsapp.ts      # WhatsApp Cloud API
│   │   │   ├── push.ts          # Expo push
│   │   │   ├── audit.ts         # Audit log helper
│   │   │   ├── cache.ts         # In-memory cache
│   │   │   └── ledger.ts        # GL ledger logic
│   │   ├── services/
│   │   │   ├── automation.ts    # Scheduled tasks
│   │   │   ├── backup.ts        # DB backup
│   │   │   └── sync.ts          # n8n sync
│   │   └── seed/                # Sample data
│   └── prisma/
│       ├── schema.prisma        # Full schema (45 models)
│       └── migrations/
└── package.json                 # Root workspace
```

---

## Features

### Member Management
- 4-step registration flow (personal, address, documents, payment)
- Family member (affiliate) management
- QR card generation for access
- AMC renewal tracking
- Bulk import/export

### Billing & Payments
- Department invoicing (restaurant, salon, gym, pool, banquet, PT)
- Walk-in guest billing
- Tax calculation (GST)
- Payment approval workflow (PENDING_APPROVAL → PAID)
- **WhatsApp notifications** — on approval, member receives bill, amount received, and balance via WhatsApp Cloud API
- Ledger with running balance

### Restaurant POS & Kitchen Display
- Table-based ordering with interactive layout
- KOT (Kitchen Order Ticket) system
- Menu categories and modifiers (Veg/Non-Veg, add-ons)
- Auto stock deduction on order placement
- Order history by table

### Inventory
- Stock items with units and reorder levels
- Low-stock alerts via real-time notification
- Usage logging
- Stock adjustment history

### Asset Management
- Asset register with purchase details, warranty
- Depreciation tracking
- Maintenance scheduling
- Scrap/disposal workflow

### Concierge (Help Desk)
- Complaint ticketing with categories and priority
- Real-time chat between members and staff
- Status tracking (OPEN, IN_PROGRESS, RESOLVED)

### Staff Management
- Roles: SUPER_ADMIN, ADMIN, CLUB_MANAGER, ACCOUNTANT, FRONT_DESK, SECURITY, FNB, HOUSEKEEPING, MAINTENANCE
- Attendance tracking
- Salary/payroll
- Leave management
- Housekeeping task allocation

### Access Control
- Fingerprint/webcam check-in
- QR code scanning for members and family
- Real-time entry logs with allowed/denied status
- Blacklist management

### Activities (Estate Curation)
- Activity scheduling with venue and capacity
- Member registration with waitlist
- Email notifications to members

### Announcements
- Estate-wide notices
- Real-time push via Socket.IO

### Feedback
- Post-billing feedback modal (star rating + comments)
- Dashboard for staff to review and mark as handled

### Reports & Analytics
- Revenue charts (daily/monthly/yearly)
- Member growth metrics
- Department-wise billing breakdown
- Edit Logs (audit trail for invoice changes)

---

## Role-Based Access

| Page / Action              | SUPER_ADMIN | ADMIN | CLUB_MANAGER | ACCOUNTANT | Others |
| -------------------------- | :---------: | :---: | :----------: | :--------: | :----: |
| Dashboard                  |      ✅      |   ✅   |      ✅       |     ✅      |   ✅    |
| Members (CRUD)             |      ✅      |   ✅   |      ✅       |     ✅      |   —    |
| Billing                    |      ✅      |   ✅   |      ✅       |     ✅      |   —    |
| Restaurant POS             |      ✅      |   ✅   |      ✅       |     —      |  FNB   |
| Inventory                  |      ✅      |   ✅   |      ✅       |     —      |   —    |
| Assets                     |      ✅      |   ✅   |      ✅       |     —      |   —    |
| Activities                 |      ✅      |   ✅   |      ✅       |     —      |   —    |
| Announcements              |      ✅      |   ✅   |      ✅       |     —      |   —    |
| Concierge                  |      ✅      |   ✅   |      ✅       |     —      |   ✅    |
| Access Logs                |      ✅      |   ✅   |      ✅       |     —      | SECURITY |
| Staff / Salary             |      ✅      |   ✅   |      ✅       |     —      |   —    |
| Edit Logs (under Insights) |      ✅      |   —    |      —       |     —      |   —    |
| Feedback                   |      ✅      |   ✅   |      ✅       |     ✅      |   —    |

All create/update/delete actions are further gated by `usePermission(screenKey, action)` which checks a `UserScreenAccess` table.

---

## Real-Time Events (Socket.IO)

The system uses Socket.IO for live updates. Events are emitted from the backend and handled by `SocketContext` on the frontend:

| Event                | Trigger                            | Shows Toast? |
| -------------------- | ---------------------------------- | :----------: |
| `new_invoice`        | Invoice created                    |      ✅      |
| `payment_received`   | Payment approved                   |      —      |
| `payment_confirmed`  | Payment approved (with balance)    |      ✅      |
| `new_kot`            | KOT sent to kitchen                |      ✅      |
| `new_announcement`   | Estate notice published            |      ✅      |
| `new_message`        | Concierge chat message             |      ✅      |
| `low_stock_alert`    | Stock below reorder level          |      ✅      |
| `new_access_log`     | Entry attempt (allowed/denied)     |      ✅      |
| `activity_update`    | New activity created               |      ✅      |

Staff are registered in rooms by `userId` and `role`, allowing targeted notifications.

---

## WhatsApp Integration

When a payment is approved, the system sends the member a WhatsApp message with:

- Invoice number
- Amount received
- Outstanding balance

### Prerequisites
1. A WhatsApp Business Account (WABA) from Meta
2. A phone number linked to the WABA (the club's number, e.g. +91 78880 05995)
3. A **payment_confirmation** message template approved in Meta Business Manager
4. The Phone Number ID and a permanent access token

### Setup

```env
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_ACCESS_TOKEN=EAAx...
WHATSAPP_API_VERSION=v22.0
```

**Sending number:** +91 78880 05995 (linked via the Phone Number ID in WABA)  
**Recipient:** Member's `whatsappNumber` field (falls back to `mobileNumber`)

If not configured, the system logs the message to the console in development mode.

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (or Supabase project)

### 1. Install dependencies
```bash
npm install
```

### 2. Database setup
```bash
cd backend
cp .env.example .env          # Edit DATABASE_URL
npx prisma migrate dev
npx prisma db seed
```

### 3. Start the app
```bash
./start.sh                    # Both servers
# or separately:
npm run dev:frontend          # http://localhost:3000
npm run dev:backend           # http://localhost:5001/api
```

### 4. Login
- **Email:** `admin@stellaar.com`
- **Password:** `admin123`

### 5. Run tests
```bash
npm test                      # All tests
npm run test -w frontend      # Frontend only
npm run test -w backend       # Backend only
```

---

## API Overview

| Base Path     | Description            |
| ------------- | ---------------------- |
| `/api/auth`   | Login, reset password  |
| `/api/member` | Member CRUD, import    |
| `/api/billing`| Invoices, payments     |
| `/api/menu`   | Menu items, categories |
| `/api/restaurant` | POS, KOT, orders   |
| `/api/inventory`  | Stock, usage      |
| `/api/asset`  | Asset lifecycle       |
| `/api/complaint`  | Help desk, messages |
| `/api/access` | Entry logs, checks    |
| `/api/activity`   | Estate curation   |
| `/api/announcement` | Notices          |
| `/api/reports`| Charts, feedback      |
| `/api/audit`  | Edit trail            |
| `/api/staff`  | Attendance, salary    |

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Auth
JWT_SECRET=your-secret

# Server
PORT=5001
FRONTEND_URL=http://localhost:3000

# SMTP (Email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=office@example.com
SMTP_PASS=app-password
SMTP_SECURE=true

# WhatsApp Cloud API
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_API_VERSION=v22.0

# Expo Push
EXPO_ACCESS_TOKEN=
```

---

## Deployment

The app uses a two-service architecture: **Frontend (Next.js)** on Vercel + **Backend (Express API)** on Render/Railway/VPS.

### Architecture

```
Vercel (Next.js)          Render / Railway (Express)
┌─────────────────┐       ┌───────────────────────┐
│  thestellaar.    │       │  api.stellaar.com     │
│  vercel.app      │       │                       │
│                  │ HTTP  │  ┌─────────────────┐  │
│  NEXT_PUBLIC_    │──────►│  │ Prisma →        │  │
│  API_URL =       │       │  │ Supabase        │  │
│  https://api.    │◄──────│  │ (PostgreSQL)    │  │
│  stellaar.com/api│  JSON │  └─────────────────┘  │
│                  │       │                       │
│  Socket.io       │◄──────│  WebSocket (realtime) │
└─────────────────┘       └───────────────────────┘
```

### Deploy Backend to Render

1. Push your repo to GitHub
2. Go to [render.com](https://render.com) → **New +** → **Web Service**
3. Connect your GitHub repo
4. Fill in:

   | Setting | Value |
   |---------|-------|
   | **Name** | `stellaar-backend` |
   | **Root Directory** | `backend` |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install && npx prisma generate && npm run build` |
   | **Start Command** | `npm run start` |
   | **Plan** | `Free` |

5. Add environment variables (click **Advanced** → **Add Environment Variable**):

   ```
   PORT=5001
   DATABASE_URL=postgresql://...
   DIRECT_URL=postgresql://...
   JWT_SECRET=your-secret
   FRONTEND_URL=https://your-app.vercel.app
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=office@thestellaar.com
   SMTP_PASS=your-app-password
   SMTP_SECURE=true
   ```

6. Click **Deploy Web Service**

After deployment, you'll get a URL like `https://stellaar-backend.onrender.com`.

> **Alternatively:** Use Railway or Fly.io with the same config. The `backend/render.yaml` file can be used for Render Blueprint deploys.

### Deploy Frontend to Vercel

#### Option A: Vercel Dashboard

1. Push your repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**
3. Import your GitHub repo
4. **Root Directory** → click **Edit** → select `frontend/`
5. **Framework Preset** → auto-detects **Next.js**
6. **Environment Variables** → add:

   ```
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api/
   ```

7. Click **Deploy**

#### Option B: Vercel CLI

```bash
cd frontend
npx vercel --prod --env NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api/
```

Your frontend will be live at `https://frontend-xxxxx.vercel.app`.

### Post-Deployment

1. **Update `FRONTEND_URL`** in your Render backend env vars to your Vercel URL:
   ```
   FRONTEND_URL=https://your-app.vercel.app
   ```
2. **Update CORS** — The backend already reads `FRONTEND_URL` for CORS. You can pass multiple origins:
   ```
   FRONTEND_URL=https://your-app.vercel.app,http://localhost:3000
   ```
3. **Verify API** — Visit `https://your-backend.onrender.com/health` — should return `{"status":"ok"}`

### Troubleshooting

| Symptom | Fix |
|---------|-----|
| Frontend loads but API calls fail | Check `NEXT_PUBLIC_API_URL` env var in Vercel |
| Backend returns 403 | Check CORS — `FRONTEND_URL` must match your Vercel domain |
| Prisma connection errors | Verify `DATABASE_URL` and `DIRECT_URL` in Render env vars |
| Socket.io not connecting | Ensure WebSocket transport works on your hosting plan (Render free tier supports it) |
| Login page shows "Network Error" | Check backend health endpoint and env vars |

---

## License

Proprietary — The Stellaar Club
