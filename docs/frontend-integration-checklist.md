# Frontend/Mobile Integration Checklist

This checklist maps current clients to the backend contract in `docs/backend-api.md`, with focus on refresh-token migration and endpoint alignment.

## Priority 0 (must do first)

- [ ] **Adopt refresh-token storage in both clients**
  - Backend login/register/refresh now return `{ token, refreshToken, user }`.
  - Clients currently persist only access token.

- [ ] **Implement token-rotation flow**
  - On `401` from protected APIs, call `POST /api/auth/refresh` with `{ refreshToken }`.
  - Replace both tokens with returned values.
  - Retry original request once.
  - If refresh fails, force logout.

---

## Web Admin (frontend)

### Files to update

- `frontend/src/lib/api.js`
- `frontend/src/lib/auth` (or wherever `setToken/getToken/clearAuth` are defined)
- `frontend/src/contexts/AdminAuthProvider.jsx`

### Required changes

- [ ] **Persist `refreshToken` in local storage**
  - Add storage key (example: `ncc_refresh_token`).

- [ ] **Update login success handling**
  - In `AdminAuthProvider.login`, save `data.refreshToken` along with `data.token`.

- [ ] **Add refresh helper in API layer**
  - In `apiFetch`, when request fails with `401` (except login/refresh routes), call `POST /auth/refresh` with refresh token.
  - On success:
    - update `ncc_token` and `ncc_refresh_token`
    - retry original request once
  - On failure:
    - clear auth and dispatch `ncc_logout`.

- [ ] **Call logout endpoint before local clear**
  - During logout, call `POST /auth/logout` with current refresh token, then clear local storage (best effort).

---

## Mobile App (Expo)

### Files to update

- `mobiles/mobile/context/auth-context.tsx`
- `mobiles/mobile/lib/api.ts`

### Required changes

- [ ] **Store refresh token in AsyncStorage**
  - Add new key (example: `refresh_token`).
  - Extend persisted auth payload to include refresh token.

- [ ] **Adjust login/register response typing**
  - Current types use `{ token, user }`; update to `{ token, refreshToken, user }`.
  - Affects:
    - `login`
    - `loginStaff`
    - `registerStudent`

- [ ] **Add axios response interceptor for refresh**
  - On `401`, call `POST /auth/refresh` with refresh token.
  - Update `Authorization` header + AsyncStorage on success.
  - Retry original request one time.
  - On failure, clear auth state + storage.

- [ ] **Update logout behavior**
  - `logout()` should call `POST /auth/logout` with refresh token before local clear (ignore network failures).

---

## Endpoint Alignment Notes

- [ ] **Keep using existing exam attempt routes**
  - Current mobile exam flow is aligned:
    - `POST /attempt/start`
    - `POST /attempt/answer`
    - `POST /exams/submit`
  - Alias `POST /attempt/save-progress` exists but optional.

- [ ] **Staff exam detail route is now explicit**
  - Staff full-detail exam fetch should use `GET /staff/exams/:id` instead of student route.

- [ ] **Student exam route now enforces publish state**
  - `GET /exams/:id` returns `403` if exam unpublished.
  - Handle this in student UI with a clear message.

---

## Optional Enhancements (recommended)

- [ ] **Centralize role-aware routing**
  - After `me`/login, route by role:
    - `STUDENT` -> student app flow
    - `INSTRUCTOR` / `ADMIN` -> staff/admin portal

- [ ] **Expose new staff analytics in UI**
  - Add UI integrations for:
    - `GET /results/summary/:examId`
    - `GET /results/export/:examId`
    - `GET /exam/flags/:examId`
    - `GET /api/admin/logs` (admin only)

- [ ] **Handle 429 (rate-limit) gracefully**
  - Show retry-friendly message for auth/attempt/anti-cheat endpoints.

---

## Suggested Implementation Order

1. Web token + refresh migration.
2. Mobile token + refresh migration.
3. Add logout endpoint calls.
4. Staff/student endpoint hardening (`/staff/exams/:id`, unpublished handling).
5. Optional analytics/flags/logs UI integration.
