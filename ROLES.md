# Role Hierarchy & Permissions Matrix

## Hierarchy

```
SUPER_ADMIN ── Full system control, ledger, init, users, delete anything
│
├── ADMIN ── Almost everything except system-level ops & user mgmt
│   │
│   ├── CLUB_MANAGER ── Same as ADMIN minus salary, attendance bulk, audit
│   │   │
│   │   ├── OPERATIONS_MANAGER ── Members, housekeeping supervisor, restaurant/table approvals, activities
│   │   │
│   │   ├── ACCOUNTANT ── Billing approvals, cancellations, AMC defaulters, audit logs, reports, GST
│   │   │
│   │   ├── DATA_OPERATOR ── Create members, invoices, inventory restock, walk-in guests
│   │   │
│   │   └── SALES_EXECUTIVE ── Create members & family members, view requests
│   │
│   ├── RESTAURANT_MANAGER ── Inventory CRUD, table reservations, menus
│   │
│   ├── SALON_MANAGER ── Menu items (salon), view requests
│   │
│   └── HOUSEKEEPING_SUPERVISOR ── Housekeeping task/alloc/deep-clean mgmt
│
├── RECEPTIONIST ── Members, walk-in guests, announcements, activities, concierge
│
├── HOUSEKEEPING_EXECUTIVE ── View/start/complete own tasks, attendance
│
├── CHEF ── Kitchen Display System only
│
├── WAITER ── Restaurant POS only
│
└── MEMBER ── Own profile, invoices, reservations, complaints, feedback, AMC
```

---

## Permissions Matrix

### Executive Tier

| Domain | SUPER_ADMIN | ADMIN | CLUB_MANAGER |
|--------|:-----------:|:-----:|:------------:|
| User Management | ● Full | ○ | ○ |
| System Init / Backup | ● Full | ○ | ○ |
| Ledger | ● Full | ○ | ○ |
| All DELETE Operations | ● Full | ○ | ○ |
| Members | ● Full | ● Full | ● Full |
| Family Management | ● Full | ● Full | ● Full |
| Billing / Invoices | ● Full | ● Full | ● Full |
| Payment Approval | ● Full | ● Full | ● Full |
| Restaurant / Tables | ● Full | ● Full | ● Full |
| Salon Menu | ● Full | ○ | ○ |
| Inventory | ● Full | ● Full | ● Full |
| HK Tasks | ● Full | ● Full | ● Full |
| HK Allocations | ● Full | ● Full | ● Full |
| HK Deep Cleaning | ● Full | ● Full | ● Full |
| Activities | ● Full | ● Full | ● Full |
| Announcements | ● Full | ● Full | ● Full |
| Reports | ● Full | ● Full | ● Full |
| Audit Logs | ● Full | ● Full | ○ |
| Staff Salary | ● Full | ● Full | ○ |
| Leave Management | ● Full | ● Full | ● Full |
| Walk-in Guests | ● Full | ● Full | ● Full |
| AMC Approvals | ● Full | ● Full | ● Full |

### Management Tier

| Domain | OPS_MANAGER | ACCOUNTANT | DATA_OPERATOR | SALES_EXECUTIVE |
|--------|:-----------:|:----------:|:-------------:|:---------------:|
| Members | ▲ Create | ○ | ▲ Create | ▲ Create |
| Family Management | ● Full | ◆ View | ● Full | ● Full |
| Billing / Invoices | ○ | ● Full | ▲ Create | ○ |
| Payment Approval | ○ | ● Full | ○ | ○ |
| Restaurant / Tables | ● Full | ○ | ○ | ○ |
| Salon Menu | ○ | ○ | ○ | ○ |
| Inventory | ○ | ○ | ◆ View | ○ |
| HK Tasks | ● Full | ○ | ○ | ○ |
| HK Allocations | ● Full | ○ | ○ | ○ |
| HK Deep Cleaning | ● Full | ○ | ○ | ○ |
| Activities | ● Full | ○ | ○ | ○ |
| Announcements | ○ | ● Full | ○ | ○ |
| Reports | ○ | ● Full | ○ | ○ |
| Audit Logs | ○ | ● Full | ○ | ○ |
| Leave Management | ◆ View | ◆ View | ◆ View | ◆ View |
| Walk-in Guests | ○ | ○ | ▲ Create | ○ |
| AMC Approvals | ○ | ○ | ○ | ○ |

### Department Tier

| Domain | RESTAURANT_MGR | SALON_MGR | HK_SUPERVISOR | RECEPTIONIST |
|--------|:--------------:|:---------:|:-------------:|:------------:|
| Members | ○ | ○ | ○ | ▲ Create |
| Family Management | ◆ View | ◆ View | ◆ View | ● Full |
| Billing / Invoices | ○ | ○ | ○ | ○ |
| Restaurant / Tables | ● Full | ○ | ○ | ○ |
| Salon Menu | ○ | ● Full | ○ | ○ |
| Inventory | ● Full | ○ | ○ | ○ |
| HK Tasks | ○ | ○ | ● Full | ○ |
| HK Allocations | ○ | ○ | ● Full | ○ |
| HK Deep Cleaning | ○ | ○ | ● Full | ○ |
| Activities | ○ | ○ | ○ | ● Full |
| Announcements | ○ | ○ | ○ | ● Full |
| Leave Management | ◆ View | ◆ View | ◆ View | ◆ View |
| Walk-in Guests | ○ | ○ | ○ | ▲ Create |
| AMC Approvals | ○ | ○ | ○ | ○ |

### Staff & Member Tier

| Domain | HK_EXECUTIVE | CHEF | WAITER | MEMBER |
|--------|:-----------:|:----:|:-----:|:------:|
| Members | ○ | ○ | ○ | ◆ Self only |
| Family Management | ○ | ○ | ○ | ◆ Request |
| Billing / Invoices | ○ | ○ | ○ | ◆ View own |
| Restaurant / Tables | ○ | ○ | ◆ POS | ◆ Reserve |
| Kitchen Display | ○ | ◆ View | ○ | ○ |
| HK Tasks | ◆ View own | ○ | ○ | ○ |
| Activities | ○ | ○ | ○ | ◆ Reserve |
| Announcements | ○ | ○ | ○ | ◆ View |
| Leave Management | ○ | ○ | ○ | ◆ Apply |
| AMC Approvals | ○ | ○ | ○ | ◆ Submit |

### Legend

| Symbol | Meaning |
|:------:|---------|
| ● Full | Create, Read, Update, Delete (full CRUD) |
| ▲ Create | Create only (no edit/delete) |
| ◆ View | Read-only access (no create/edit/delete) |
| ◆ Self | Own data only |
| ○ | No access |

---

## Role Groups (Code Constants)

### `ALL_ADMINS` (Frontend Sidebar)
`SUPER_ADMIN`, `ADMIN`, `CLUB_MANAGER`, `OPERATIONS_MANAGER`, `DATA_OPERATOR`, `SALES_EXECUTIVE`, `ACCOUNTANT`, `RESTAURANT_MANAGER`, `SALON_MANAGER`, `HOUSEKEEPING_SUPERVISOR`

### `ALL_ADMINS` (Backend Leave Routes)
Same as above + `RECEPTIONIST`

### `SENIOR` (Frontend Sidebar)
`SUPER_ADMIN`, `ADMIN`, `CLUB_MANAGER`

### `SUPERVISOR_ROLES` (Backend Housekeeping)
`SUPER_ADMIN`, `ADMIN`, `CLUB_MANAGER`, `OPERATIONS_MANAGER`, `HOUSEKEEPING_SUPERVISOR`

### `STAFF_ROLES` (Backend Attendance)
`SUPER_ADMIN`, `ADMIN`, `CLUB_MANAGER`, `OPERATIONS_MANAGER`, `HOUSEKEEPING_EXECUTIVE`, `ACCOUNTANT`, `HOUSEKEEPING_SUPERVISOR`, `SALON_MANAGER`, `RESTAURANT_MANAGER`, `RECEPTIONIST`

### `STAFF_ROLES` (Backend Activities)
`SUPER_ADMIN`, `ADMIN`, `CLUB_MANAGER`, `OPERATIONS_MANAGER`, `RECEPTIONIST`

---

## Screen-Level Permissions

Each staff user has a `UserScreenAccess` record. SUPER_ADMIN bypasses this check. 27 screen keys exist:

`overview`, `requests`, `records`, `activities`, `members`, `concierge`, `notices`, `billing`, `amc-approvals`, `ledger`, `restaurant-pos`, `kitchen-display`, `inventory`, `assets`, `salon-menu`, `housekeeping`, `housekeeping-tasks`, `housekeeping-allocations`, `housekeeping-deep-cleaning`, `housekeeping-reports`, `reports`, `audit-logs`, `users`, `leave`, `system-init`, `staff-attendance`, `staff-salary`

---

## Files That Control Permissions

| File | What It Controls |
|------|-----------------|
| `backend/src/middleware/auth.ts` | `authenticateToken`, `authorizeRoles` middleware |
| `backend/src/routes/*.ts` | Per-route `authorizeRoles()` calls |
| `backend/prisma/seed.ts` | Role definitions seeded into DB |
| `frontend/src/components/layout/Sidebar.tsx` | Frontend menu visibility per role |
| `backend/src/routes/user.ts` (L250-327) | Screen-level permission assignment |
| `backend/prisma/schema.prisma` (UserScreenAccess model) | Screen permission data model |

---

## Prompt to Implement Full Working Hierarchy

> You are implementing a role-based access control (RBAC) system for a club management app. Below is the complete role hierarchy and permissions matrix. Audit every endpoint in `backend/src/routes/*.ts` and every menu item in `frontend/src/components/layout/Sidebar.tsx` to match the matrix exactly.
>
> **Rules:**
> 1. SUPER_ADMIN has unrestricted access to everything.
> 2. Only SUPER_ADMIN can DELETE any record.
> 3. SUPER_ADMIN and ADMIN can manage users, salary, system settings.
> 4. CLUB_MANAGER inherits ADMIN permissions minus salary CRUD, attendance bulk create, audit log access, and user management.
> 5. OPERATIONS_MANAGER has housekeeping supervisor powers, can register members, approve table reservations, create/edit activities.
> 6. ACCOUNTANT can process payments/cancellations, view audit logs, access reports, check AMC defaulters, create announcements.
> 7. DATA_OPERATOR can create members/invoices, restock inventory, create walk-in guests.
> 8. SALES_EXECUTIVE can only create members and family members, view pending requests.
> 9. RESTAURANT_MANAGER can manage inventory CRUD, approve table reservations, view salon menu.
> 10. SALON_MANAGER can CRUD menu items (salon category).
> 11. HOUSEKEEPING_SUPERVISOR can manage tasks, allocations, deep cleaning, view employees.
> 12. HOUSEKEEPING_EXECUTIVE can only view/start/complete their own assigned tasks and mark attendance.
> 13. RECEPTIONIST can create members, walk-in guests, announcements, activities, view members and concierge.
> 14. CHEF can only access Kitchen Display System.
> 15. WAITER can only access Restaurant POS.
> 16. MEMBER can only view their own profile, invoices, reservations, submit complaints/feedback/AMC.
>
> **Implementation steps:**
> 1. Update every `authorizeRoles()` call in all route files under `backend/src/routes/` to match the matrix.
> 2. Update `frontend/src/components/layout/Sidebar.tsx` to match the menu visibility per role.
> 3. Ensure `backend/src/routes/leave.ts` ALL_ADMINS includes RECEPTIONIST.
> 4. All DELETE endpoints must be SUPER_ADMIN only.
> 5. Add missing authorizations where routes are marked just `authenticated` but should be restricted.
>
> Use the ROLES.md file as the single source of truth.

---

*Generated from codebase audit. Last updated: 2026-06-30*
