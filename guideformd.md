# Shell Scripts Reference Guide

| Script | Purpose | Referenced From |
|--------|---------|-----------------|
| `start.sh` | Combined launcher — kills stale processes, verifies Supabase, shows backup status, starts backend (5001) + frontend (3000) | `supabase_start.sh` (33, 82), `STATUS.md` (25, 27), `README.md` (303) |
| `kill_all.sh` | Emergency kill — force-terminates backend `tsx`, Next.js dev, and ports 3000/5001 | — |
| `clean-backups.sh` | Removes `recovery-node-*.db` + `manifest.json` from `backend/backups/` | — |
| `test_suite.sh` | 8-stage system test suite: DB schema, backend/frontend tests, type-check, lint, build, DB integrity, auth stress test | `STATUS.md` (25, 40, 62, 88, 89, 98, 103) |
| `requests.sh` | DB stress test — 300 weighted `curl` requests across public/authenticated endpoints | — |
| `full_test.sh` | Exhaustive 27-section API test covering every route + role enforcement | — |
| `generate_contract.sh` | Wrapper for `generate_contract.py` to produce a Development Services Agreement `.docx` | — |
| `clean-transactions.sh` | Deletes transactional data (auditLog, maintenanceLog, inventory, payments, invoices, etc.) preserving users/roles/members/staff | — |
| `supabase_start.sh` | Supabase Cloud wake-up — checks DB paused status, optionally calls Management API `/restore`, polls until ready, then runs `start.sh` | — |

## External References

- **`start.sh`** — referenced by `supabase_start.sh`, `STATUS.md`, `README.md`
- **`test_suite.sh`** — referenced by `STATUS.md` (7 occurrences)
- **Remaining 7 scripts** — no external references found in the codebase (no CI configs, `package.json`, YAML, or YML files reference them)
