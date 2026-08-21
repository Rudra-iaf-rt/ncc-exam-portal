# Migration Audit Validation Report

[ ] Every Prisma model in 01_data_model.md appears in at least one API endpoint in 03_api_surface.md
FAIL: [Every Prisma model in 01_data_model.md appears in at least one API endpoint in 03_api_surface.md] — The `StudyMaterial` model is listed in the data model but is not explicitly named as a referenced Prisma model in the documented API endpoints (only `/api/materials` is documented without the model reference). — files involved: 01_data_model.md, 03_api_surface.md

[ ] Every API endpoint in 03_api_surface.md appears in at least one screen in 04_frontend_features.md, OR is documented as a background/admin-only endpoint
FAIL: [Every API endpoint in 03_api_surface.md appears in at least one screen in 04_frontend_features.md, OR is documented as a background/admin-only endpoint] — Endpoints like `/api/auth/register`, `/api/auth/password/reset`, and `/api/auth/password/verify-token` are marked as Public in the API surface but do not appear in any screen in the frontend features inventory. — files involved: 03_api_surface.md, 04_frontend_features.md

[ ] Every frontend route in 04_frontend_features.md has a role assignment in the permission matrix in 02_auth_architecture.md
FAIL: [Every frontend route in 04_frontend_features.md has a role assignment in the permission matrix in 02_auth_architecture.md] — The permission matrix is feature-based (e.g., "Take exams"), meaning specific frontend routes like `/login`, `/admin/login`, and `/cadet/profile` are not explicitly mapped. — files involved: 04_frontend_features.md, 02_auth_architecture.md

[ ] Every risk in 06_migration_risk_register.md references at least one file from the web codebase
FAIL: [Every risk in 06_migration_risk_register.md references at least one file from the web codebase] — RISK-012 (Analytics & Tracking) lists `Files affected: N/A` instead of referencing a specific file in the web codebase. — files involved: 06_migration_risk_register.md

[x] The AGENTS.md permission matrix exactly matches the matrix in 02_auth_architecture.md (no drift)
PASS

[x] Any endpoint marked "NOT FOUND — manual review required" in any phase is listed in the validation report and escalated to the team before migration begins
PASS: No endpoints were marked with this string during the audit phases.
