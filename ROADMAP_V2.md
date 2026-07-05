# Master Implementation Plan: Stellaar V2.0 Overhaul

This roadmap tracks the massive requested updates broken down into **6 Logical Phases**.

## Phase 1: Security, Naming & Database Foundation
- [x] **Module Renaming:**
  - Rename "Billing" to **"Finances"** (or "Cashiering").
  - Rename "Inventory" to **"Store"**.
- [x] **Schema Updates:**
  - Update Prisma schema to support: AMC Years (e.g., "2024"), 5-Year/Dec31 validities, Member Balances/Part-Payments, Check/UPI Transaction IDs, and Recipe ingredient exact weights (grams/pieces).
- [x] **Emergency Panic Button (Force Network Lock):**
  - Create a global `SystemStatus` flag in the database.
  - Build a massive red "Panic Button" for the Super Admin on the Dashboard.
  - Upon activation: Force-logout all non-Super Admin tokens immediately, freeze all POS transactions (return 503 for all billing/order routes), and trigger an immediate local database snapshot.
- [x] **RBAC Refinement:** 
  - Ensure Data Operators/Staff cannot access the Finances tab without explicit permission overrides.

## Phase 2: Membership & AMC Automation
- [x] **Validity Engine:** Implement the dual-validity logic (5-Year term vs. Fixed Dec 31st cycle). Display explicit "AMC Year Paid" badges under the "Money Packed" sections.
- [x] **Auto-Lock Protocol:** Node cron job that runs daily. If the date is Jan 15th and AMC is unpaid for the current year, automatically change `accessStatus` to `DISABLED`.
- [x] **Member Forms & Details:** Replace placeholder data with custom form fields. Build an "Additional Details" sliding panel/modal.
- [x] **Family Controls:** Restrict Family Member editing: Members can view, but only Admins can add/remove family nodes.

## Phase 3: Finances, Part-Payments & Dynamic POS
- [x] **Payment Methods:** Force prompt for "Transaction ID" (UPI/Bank) or "Check Number" upon Checkout.
- [x] **Part-Payments (No EMI):** Introduce a `LedgerBalance` system. Track balances cleanly over installments.
- [x] **Automated WhatsApp:** Send automated "Received: X, Balance: Y" receipts.
- [x] **Dynamic Menus & Taxes:** Implement strict GST rules (Salon = 18%, Restaurant = 5%). Toggle between menus dynamically. Implement the 30% automatic Member Discount on food. Display absolute discount values (e.g., "Discount: ₹1,000").

## Phase 4: Store (Inventory) & Standardized Recipes
- [x] **Standardized Recipe Management:** Configure exact weights per dish (e.g., 20g butter). Auto-deduct exact weights from the "Store".
- [x] **Variance Auditing:** Theoretical vs. Actual stock comparison report for managers.
- [x] **Perishable Tracking:** Add shelf-life timers to perishable nodes. Alert managers on expiration.

## Phase 5: Restaurant Workflows & Table Management
- [x] **Floor-Wise Mapping:** Visual, clickable table layout separated by floors with capacity indicators. Prompt for exact pack size if > 4 pax.
- [x] **No Pre-Ordering (Unless Prepaid):** Block online pre-ordering of food without a 100% advance capture.
- [x] **Waiter Verification Loop:** QR orders route to a "Waiter Tablet" view first for verification before pushing to the Kitchen (KOT) and Cashier.

## Phase 6: Analytics & Feedback
- [x] **Advanced Dashboard:** "Yesterday vs. Today" collection comparison module. Pie/bar chart separating receipts (Payments, Internet, AMC, Memberships, Gym).
- [x] **Immediate Feedback Engine:** Quick-capture form post-billing. Immediate ping to Guest Relations Manager if rating is < 3 stars.
