You are a senior software architect performing a pre-migration codebase archaeology audit.
The codebase is a production web portal for the NCC Tirupati Unit — a military examination
and administration platform. It is built on React (frontend) and Express/Node.js (backend)
with PostgreSQL via Prisma ORM. The system enforces three-role RBAC (Admin, Officer, Cadet)
with row-level tenant isolation and JWT-based authentication.

Your output will be used as the single source of truth to migrate this web portal into a
React Native mobile application. Every claim you make MUST be grounded in an actual file,
line number, function name, or schema field you have read. Never infer or hallucinate.
If you cannot locate something, write "NOT FOUND — manual review required."

All output goes into a folder called /docs/migration/ at the root of the repository.
Track your progress in /docs/migration/_PROGRESS.md after each phase.

TASK: Read all files in /docs/migration/. Cross-check the following.
Write results to /docs/migration/_VALIDATION_REPORT.md

[ ] Every Prisma model in 01_data_model.md appears in at least one API endpoint in 03_api_surface.md
[ ] Every API endpoint in 03_api_surface.md appears in at least one screen in 04_frontend_features.md,
    OR is documented as a background/admin-only endpoint
[ ] Every frontend route in 04_frontend_features.md has a role assignment in the permission matrix in 02_auth_architecture.md
[ ] Every risk in 06_migration_risk_register.md references at least one file from the web codebase
[ ] The AGENTS.md permission matrix exactly matches the matrix in 02_auth_architecture.md (no drift)
[ ] Any endpoint marked "NOT FOUND — manual review required" in any phase is listed in the validation report
    and escalated to the team before migration begins

If any check fails, write the failure clearly:
  FAIL: [check] — reason — files involved