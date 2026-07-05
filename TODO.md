# The Stellaar - Project Roadmap & Pending Tasks

This document outlines the remaining features and enhancements required to achieve full production readiness as per the **TS_APP_MVP.docx** specification.

---

## 🚀 High Priority (MVP Completion)

### 1. Access Control Hardware Integration
- [ ] **Webhook Handlers:** Implement specific API endpoints to receive signals from biometric devices (Hikvision, Essl, etc.).
- [ ] **Hardware Sync:** Establish real-time data flow between physical entry nodes and the digital `AccessLog`.
- [ ] **Security Dashboard:** Create a live monitor for security desks to see real-time biometric verification results.
- *Requirement:* Section 1: "Real-time biometric sync."

### 2. Payment Gateway Integration
- [ ] **Razorpay/Stripe Setup:** Integrate an active payment provider for online transactions.
- [ ] **Portal Payments:** Enable members to pay Salon, Gym, Pool, and AMC dues directly from their dashboard.
- [ ] **Automated Receipts:** Generate digital payment receipts upon successful online transaction.
- *Requirement:* Section 1: "Online billing and payment collection."

### 3. Progressive Web App (PWA) Features
- [ ] **Manifest & Icons:** Configure the PWA manifest for "Add to Home Screen" support on Android and iOS.
- [ ] **Service Workers:** Implement service workers for offline caching, specifically for Member QR Membership Cards.
- [ ] **Offline Access:** Ensure the digital passport remains accessible even without an active internet connection.
- *Requirement:* Section 1: "Progressive Web App (PWA) for mobile compatibility."

### 4. Membership & AMC Automation
- [x] **Automated Billing Engine:** Implement a cron job or background worker to auto-generate AMC invoices.
- [x] **AMC Approval Workflow:** Members can upload proof, and admins can verify/approve payments.
- [ ] **Dynamic AMC Rules:** Create a configuration UI for Super Admins to set AMC rates and grace periods per plan.
- [ ] **Grace Period Enforcement:** Automatically disable access status for members who exceed the AMC payment deadline.
- *Requirement:* Section 2.1: "AMC rules and automated tracking."

---

## 💎 Advanced Features (Elite Operations)

### 5. Digital Wallet & Prepaid Credits
- [ ] **Member Balances:** Add a wallet system where members can maintain a prepaid balance.
- [ ] **Cashless POS:** Enable the Restaurant and Salon modules to deduct payments directly from the member's wallet.
- [ ] **Top-up Interface:** Allow members to recharge their wallet via the payment gateway.
- *Requirement:* "High-end club standard preferred billing method."

### 6. Departmental Specializations
- [ ] **Salon Scheduler:** Dedicated booking calendar for specific stylists and beauty services.
- [ ] **Gym Entry Monitor:** Specialized view for trainers to track gym occupancy and peak hours.
- [ ] **Department Billing:** Refine billing UI to handle salon-specific items and gym personal training packages.
- *Requirement:* Section 1: "Salon/Gym/Swimming Billing."

### 7. Notifications Expansion (Multi-channel)
- [ ] **SMS Gateway:** Integrate an SMS provider (e.g., Twilio) for critical billing and security alerts.
- [ ] **Email Alerts:** Implement automated email notifications for new announcements and monthly statements.
- [ ] **Push Notifications:** Configure browser push notifications for real-time engagement.
- *Requirement:* "Crucial for billing dues and emergency announcements."

---

## ✅ Completed Modules
- **Cloud Database:** Fully migrated to **Supabase Cloud (PostgreSQL)** with Multi-Schema support.
- **Dual-Node Resilience:** Autonomous **Shadow Registry** (Local SQLite) with real-time, hourly, and lifecycle sync.
- **Elite Security:** Verified 401/403 protections, RBAC hardening, and **"Elite Secure"** penetration status.
- **Reporting Engine:** Integrated high-fidelity **CSV Registry Export** for administrative audits.
- **Membership Registry:** Full CRUD, Aadhaar-based registration, and search.
- **Restaurant POS & KDS:** Table management, KOT generation, and real-time kitchen tracking.
- **Inventory Tracking:** Intelligent recipes, low-stock alerts, and automated usage logs.
- **Asset Management:** Centralized registry for club facilities and maintenance logging.
- **Advanced Concierge:** Real-time bi-directional chat between members and staff.
- **Digital Identity:** QR Membership Cards for primary members and family nodes.
- **Audit Trails:** Immutable ledger for all administrative changes with state diffing.
- **Notification Center:** Real-time in-app bell with categorized history.

---
*Roadmap maintained by Gemini CLI | Updated: June 10, 2026*
