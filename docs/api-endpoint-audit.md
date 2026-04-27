# API Endpoint Audit (Current Backend Mounts)

This audit is based on the active routes mounted in `backend/src/app.js`.

## Generated Postman Assets

- Collection: `docs/ncc-exam-portal.postman_collection.json`
- Environment: `docs/ncc-exam-portal.postman_environment.json`

Import both files into Postman, select the environment, then run folder-by-folder.

## Fixed In This Iteration

1. **Student registration endpoint added**
   - Added `POST /api/auth/register` route in `backend/src/routes/auth.routes.js`.

2. **Login/register responses now include refresh token payload**
   - Updated `backend/src/controllers/auth.controller.js` to return full auth payload from service (`token`, `refreshToken`, `user`) for:
     - student register
     - student login
     - staff login

## Major Contract Drift (Feature Missing)

3. **Allowed students module not present in current backend source**
   - No `allowed-students` routes/controllers/services are found in `backend/src`.
   - If this feature is required for admin-controlled registration, reintroduce:
     - model + migration for allowed students
     - admin CRUD + bulk upload endpoints
     - registration pre-approval checks in auth service

## Notes About Testing

- Some endpoints are role-protected (`STUDENT`, `INSTRUCTOR`, `ADMIN`), so use correct tokens:
  - `studentToken` for student-only routes
  - `staffToken` for instructor/staff routes
  - `adminToken` for admin-only routes
- If Prisma schema/client is out of sync, endpoint tests may fail with Prisma unknown-argument errors; run migrations and regenerate client first.
