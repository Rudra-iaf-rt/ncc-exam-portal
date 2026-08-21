# Auth Architecture & RBAC Analysis

## 2.1 Token Strategy

- **Strategy:** Hybrid approach. Stateless JWT for Access Tokens, Stateful opaque token (hashed in DB) for Refresh Tokens.
- **Issuance Location:** `backend/src/services/auth.service.js` in `issueSessionTokens()`. The actual signing uses `backend/src/utils/jwt.js`.
- **Token Payload (Access Token):**
  ```javascript
  const accessToken = signToken({ 
    sub: user.id, 
    role: user.role, 
    collegeCode: user.collegeCode || null 
  });
  ```
- **Access Token TTL:** Defined by `process.env.JWT_EXPIRES_IN` with a fallback to `"1h"`.
- **Refresh Token Strategy:**
  - A random 48-byte hex string is generated (`crypto.randomBytes(48).toString("hex")`).
  - It is hashed using SHA256 (`tokenHash`) and stored in the `RefreshToken` table.
  - **TTL:** Defined by `process.env.REFRESH_TOKEN_TTL_DAYS` with a fallback to `30` days.
  - **Rotation:** When a refresh token is used, the old token is soft-deleted (`revokedAt = new Date()`), and a new pair is issued (rotation). There is a 30-second grace period for concurrent requests using a revoked refresh token (`backend/src/services/auth.service.js` lines 213-219).
- **Client Storage & Transport:** 
  The `authenticate` middleware (`backend/src/middleware/auth.js`) extracts the token from three places:
  1. `Authorization: Bearer <token>`
  2. `req.cookies.ncc_access_token` (only if `features.cookieAuth` is enabled)
  3. `req.query.token` (for edge cases like SSE or websockets)

## 2.2 Middleware Chain

A standard protected request goes through this middleware chain:

1. **`authenticate`** | `backend/src/middleware/auth.js` | 
   Extracts token, verifies signature, checks if role is valid, looks up the `User` in the DB to ensure `isActive`, and attaches `req.user = { id, role, canManageExams }`.
2. **`requireStaff` / `requireAdmin` / `requireStudent`** | `backend/src/middleware/roles.js` | 
   Checks `req.user.role` against allowed values and returns 403 if insufficient.
3. **`asyncHandler`** | `backend/src/middleware/error-handler.js` | 
   Wraps the controller to catch async errors and pass them to the global error handler.

*Note on Rate Limiting:* Auth-specific routes (login, register, forgot password, refresh) use specific rate limiters (`loginRateLimiter`, `passwordResetRateLimiter`, `refreshRateLimiter`) from `backend/src/middleware/security.js`.

## 2.3 Role-Based Access Control (RBAC)

- **Roles defined:** `STUDENT`, `ADMIN`, `INSTRUCTOR`.
- **Storage:** Stored in the `User` table (`role` field) AND in the JWT payload.
- **Enforcement:** Enforced via Express middleware (`roles.js`) for backend routes, and React Router guard components (`RequireAdmin.jsx`, etc.) on the frontend. There is a special `requireExamCreator` middleware that checks if the user is an `ADMIN` OR an `INSTRUCTOR` with the `canManageExams` boolean set to true.

### Permission Matrix

| Feature / Route | Admin | Instructor | Student (Cadet) |
|---|---|---|---|
| Take exams (`/exam/:id`) | ✗ | ✗ | ✓ |
| View own results/materials | ✗ | ✗ | ✓ |
| View global exam list | ✓ | ✓ | ✗ |
| View user/cadet list | ✓ | ✓ | ✗ |
| Create/Edit Exams | ✓ | ✓ (if `canManageExams`) | ✗ |
| Administer Groups/Materials | ✓ | ✓ | ✗ |
| Manage Colleges/Staff | ✓ | ✗ | ✗ |
| View Audit Logs | ✓ | ✗ | ✗ |

## 2.4 Route Protection Map

A high-level map of backend route protection based on router definitions:

| Route Path | Guard Middleware(s) | Minimum Role Required |
|---|---|---|
| `GET /api/auth/me` | `authenticate` | Any Valid Role |
| `GET /api/leaderboard/my-rank` | `authenticate`, `requireStudent` | `STUDENT` |
| `POST /api/exams/:id/submit` (etc) | `authenticate`, `requireStudent` | `STUDENT` |
| `GET /api/admin/exams` | `authenticate`, `requireStaff` | `ADMIN` or `INSTRUCTOR` |
| `GET /api/colleges/admin/colleges` | `authenticate`, `requireStaff` | `ADMIN` or `INSTRUCTOR` |
| `GET /api/admin/groups` | `authenticate`, `requireStaff` | `ADMIN` or `INSTRUCTOR` |
| `POST /api/admin/assignments` | `authenticate`, `requireStaff` | `ADMIN` or `INSTRUCTOR` |
| `POST /api/colleges/admin/colleges` | `authenticate`, `requireAdmin` | `ADMIN` |
| `POST /api/admin/groups` | `authenticate`, `requireAdmin` | `ADMIN` |
| `GET /api/admin/logs` | `authenticate`, `requireAdmin` | `ADMIN` |
| `GET /api/admin/health` | `authenticate`, `requireAdmin` | `ADMIN` |

*(Note: Anti-cheat, specific result pulling, and notification routes are also protected via `authenticate` and their respective role guards).*

## 2.5 Frontend Route Guards

Based on `frontend/src/App.jsx`, the client-side routes are guarded by Wrapper Components:

| Frontend Path | Component | Guard | Minimum Role |
|---|---|---|---|
| `/cadet/dashboard`, `/cadet/results`, etc | `CadetDashboard`, etc | `<RequireCadet>` | `STUDENT` |
| `/exam/:id`, `/exam/review/:id` | `ExamAttempt`, `ExamReview` | `<RequireCadet>` | `STUDENT` |
| `/admin/dashboard`, `/admin/exams`, etc | `Dashboard`, `ExamList`, etc | `<RequireStaff>` | `ADMIN` or `INSTRUCTOR` |
| `/admin/exams/create`, `/admin/staff`, `/admin/colleges`, `/admin/logs`, etc | `ExamCreate`, `StaffManagement`, etc | `<RequireAdmin>` | `ADMIN` |

## 2.6 Mobile Migration Risk — Auth

- **Token Transport:** The backend `authenticate` middleware natively supports the `Authorization: Bearer <token>` header. React Native's `fetch()` supports setting this header easily.
- **Storage Strategy Needed:** If the current web app relies on `req.cookies.ncc_access_token` for session persistence, React Native `WebView` and native `fetch` do not reliably handle `httpOnly` cookies without complex native bridging. The migration **MUST** use `expo-secure-store` (or `AsyncStorage`) to persist the Access and Refresh tokens on the device, and explicitly inject the `Authorization` header on all API calls via an Axios interceptor or fetch wrapper.
- **Deep Linking (Password Reset):** The backend `auth.service.js` already explicitly supports React Native / Expo deep linking for password resets! (e.g., `ncc-exam://reset-password?token=`). This implies that native intent handling for auth is already somewhat anticipated and greatly reduces migration friction.
- **Session Persistence:** On app restart, the React Native app should load the refresh token from `SecureStore`, call `/api/auth/refresh`, and obtain a fresh access token before rendering the protected navigation stack.
