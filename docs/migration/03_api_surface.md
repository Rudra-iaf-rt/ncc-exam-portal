# API Surface & Endpoints Analysis

Below is the detailed documentation of the core business endpoints across the backend, mapping routes to controllers, guards, and business logic. Aliased endpoints (e.g., `/login` vs `/login/student`) and standard CRUD boilerplate routes have been consolidated into the Summary Table to maintain a high signal-to-noise ratio.

---
## Authentication

### [POST] /api/auth/login (also `/login/student`)
**File:** backend/src/routes/auth.routes.js (line 10)
**Controller:** loginStudent in backend/src/controllers/auth.controller.js
**Guard:** loginRateLimiter | minimum role: none (Public)
**Request:**
  Body: { regimentalNumber: string, password: string, required: yes }
**Response:**
  200: { token: string, refreshToken: string, user: object }
  400: { error: "regimentalNumber and password are required" }
  401: { error: "Invalid credentials" }
  403: { error: "Account is disabled" }
**Business Logic Summary:**
  - Queries `User` table for `regimentalNumber` and `role: STUDENT`.
  - Compares bcrypt password hash.
  - Generates JWT Access Token and opaque Refresh Token (stored in `RefreshToken` table).
  - Emits `AUTH_LOGIN_STUDENT` audit log via `auditLogService`.
  - Sets `ncc_access_token` and `ncc_refresh_token` cookies (if cookieAuth is enabled).
**Mobile Notes:**
  Returns tokens in the JSON payload natively. Mobile apps should ignore the `Set-Cookie` headers and explicitly store the JSON tokens in Expo `SecureStore`.

---
### [POST] /api/auth/login/staff
**File:** backend/src/routes/auth.routes.js (line 12)
**Controller:** loginStaff in backend/src/controllers/auth.controller.js
**Guard:** loginRateLimiter | minimum role: none (Public)
**Request:**
  Body: { email: string, password: string, required: yes }
**Response:**
  200: { token: string, refreshToken: string, user: object }
  401: { error: "Invalid credentials" }
**Business Logic Summary:**
  - Queries `User` table for `email` and role in `[ADMIN, INSTRUCTOR]`.
  - Validates password, issues JWT and Refresh Token, logs `AUTH_LOGIN_STAFF`.

---
### [GET] /api/auth/me
**File:** backend/src/routes/auth.routes.js (line 18)
**Controller:** me in backend/src/controllers/auth.controller.js
**Guard:** authenticate | minimum role: Authenticated (Any)
**Request:**
  Headers: Authorization: Bearer <token>
**Response:**
  200: { user: { id, name, email, role, collegeCode, etc } }
  401: { error: "Authentication required" }
**Business Logic Summary:**
  - Extracts `req.user.id` from JWT.
  - Queries Redis cache (`auth:me:${id}`) first. If miss, queries `User` table.
  - Caches result in Redis for 300 seconds to minimize DB hits on subsequent page loads.

---
### [POST] /api/auth/refresh
**File:** backend/src/routes/auth.routes.js (line 21)
**Controller:** refreshWithToken in backend/src/controllers/auth.controller.js
**Guard:** refreshRateLimiter | minimum role: none
**Request:**
  Body: { refreshToken: string, required: yes (if not in cookies) }
**Response:**
  200: { token: string, refreshToken: string, user: object }
  401: { error: "Invalid refresh token" }
**Business Logic Summary:**
  - Hashes the provided refresh token and looks it up in `RefreshToken` table.
  - Checks expiration and revocation (with a 30s grace period for race conditions).
  - Revokes old token and issues a new pair (Refresh Token Rotation).

---
## Exam Delivery & Attempt Execution

### [GET] /api/exams
**File:** backend/src/routes/exams.routes.js (line 92)
**Controller:** listCatalog in backend/src/controllers/exams.controller.js
**Guard:** authenticate | minimum role: Any
**Request:**
  Headers: Authorization: Bearer <token>
**Response:**
  200: { exams: array of Exam objects }
**Business Logic Summary:**
  - Fetches exams from `Exam` table where status is `PUBLISHED`.
  - If user is student, filters by `ExamAssignment` or globally available exams.
**Mobile Notes:**
  Pagination may be required for mobile views if the exam list grows large.

---
### [POST] /api/attempt/start
**File:** backend/src/routes/exams.routes.js (line 178)
**Controller:** startAttempt in backend/src/controllers/exams.controller.js
**Guard:** authenticate, requireStudent | minimum role: STUDENT
**Request:**
  Headers: Authorization: Bearer <token>
  Body: { examId: int, required: yes }
**Response:**
  200: { attemptId: int, startedAt: ISO, expiresAt: ISO }
  403: { error: "Exam not published" / "Maximum attempts reached" }
**Business Logic Summary:**
  - Validates exam exists and is active.
  - Checks `Attempt` table to enforce attempt limits.
  - Creates a new row in `Attempt` with status `IN_PROGRESS`.
  - Calculates `expiresAt` based on exam duration and current time.

---
### [POST] /api/attempt/answer
**File:** backend/src/routes/exams.routes.js (line 185)
**Controller:** saveAnswer in backend/src/controllers/exams.controller.js
**Guard:** authenticate, requireStudent | minimum role: STUDENT
**Request:**
  Headers: Authorization: Bearer <token>
  Body: { examId: int, questionId: int, answer: string }
**Response:**
  200: { ok: true, savedAt: ISO }
  403: { error: "Time expired" }
**Business Logic Summary:**
  - Verifies the `Attempt` is `IN_PROGRESS` and `expiresAt` hasn't passed.
  - Updates the `answers` JSON block in the `Attempt` table.
  - Triggers a background sync job or writes directly to DB depending on implementation.

---
### [POST] /api/attempt/submit
**File:** backend/src/routes/exams.routes.js (line 206)
**Controller:** submit in backend/src/controllers/exams.controller.js
**Guard:** authenticate, requireStudent | minimum role: STUDENT
**Request:**
  Headers: Authorization: Bearer <token>
  Body: { examId: int }
**Response:**
  200: { status: "COMPLETED", score: int (if instant results) }
**Business Logic Summary:**
  - Locks the `Attempt` row and changes status to `COMPLETED`.
  - Grades the answers against `Question` table (calculating positive/negative marks).
  - Writes final score to the `Result` table.
**Mobile Notes:**
  If offline mode is supported in React Native, the app must queue these mutations and sync them when the device comes back online.

---
## Administration & Creation

### [POST] /api/exams/create
**File:** backend/src/routes/exams.routes.js (line 38)
**Controller:** create in backend/src/controllers/exams.controller.js
**Guard:** authenticate, requireExamCreator | minimum role: INSTRUCTOR (with flag)
**Request:**
  Headers: Authorization: Bearer <token>
  Body: { title: string, duration: int, questions: array }
**Response:**
  201: { examId: int }
**Business Logic Summary:**
  - Creates an `Exam` row in `DRAFT` status via Prisma.
  - Bulk inserts `Question` rows tied to the new exam.

---
### [GET] /api/admin/users
**File:** backend/src/routes/admin.js (line 22)
**Controller:** listAll in backend/src/controllers/users.controller.js
**Guard:** authenticate, requireStaff | minimum role: ADMIN or INSTRUCTOR
**Request:**
  Headers: Authorization: Bearer <token>
  Query: { page: int, limit: int, role: string, college: string }
**Response:**
  200: { users: array, total: int }
**Business Logic Summary:**
  - Queries `User` table with pagination.
  - If instructor, injects a manual WHERE clause to filter `collegeCode` to match the instructor's college (Tenant Isolation).

---

## API Surface Summary Table

Below is the consolidated summary of the broader REST API surface. 

| Method | Path | Role(s) | Domain | Purpose |
|--------|------|---------|--------|---------|
| POST | `/api/auth/register` | Public | Auth | Register a new cadet |
| POST | `/api/auth/login` | Public | Auth | Cadet login |
| POST | `/api/auth/login/staff` | Public | Auth | Admin/Instructor login |
| GET | `/api/auth/me` | Any | Auth | Get active profile (Cached) |
| POST | `/api/auth/refresh` | Any | Auth | Rotate refresh token |
| POST | `/api/auth/logout` | Any | Auth | Revoke refresh token |
| POST | `/api/auth/password/reset` | Public | Auth | Send password reset email |
| POST | `/api/auth/password/verify-token` | Public | Auth | Validate reset link deep-link token |
| GET | `/api/exams` | Any | Exams | List available exams |
| GET | `/api/exams/:id` | `STUDENT` | Exams | Get exam details for candidate |
| POST | `/api/exams/create` | `ADMIN` / `INST` | Exams | Create manual exam |
| POST | `/api/exams/create-from-pdf` | `ADMIN` / `INST` | Exams | Upload PDF to parse via OCR/AI |
| POST | `/api/exams/create-from-excel` | `ADMIN` / `INST` | Exams | Bulk upload questions via CSV/XLSX |
| PATCH | `/api/exams/:id/publish` | `ADMIN` / `INST` | Exams | Move exam from DRAFT to PUBLISHED |
| DELETE | `/api/exams/:id` | `ADMIN` / `INST` | Exams | Soft delete exam |
| POST | `/api/attempt/start` | `STUDENT` | Attempt | Start exam timer and lock session |
| POST | `/api/attempt/answer` | `STUDENT` | Attempt | Save a single question answer |
| POST | `/api/attempt/sync` | `STUDENT` | Attempt | Bulk sync cached answers |
| POST | `/api/attempt/submit` | `STUDENT` | Attempt | Finalize attempt and grade |
| GET | `/api/results` | `STUDENT` | Results | Get historical results for active user |
| GET | `/api/leaderboard/unit/:code` | `ADMIN` / `INST` | Results | Get unit-wide ranked leaderboards |
| GET | `/api/admin/users` | `ADMIN` / `INST` | Admin | List users (Tenant isolated for INST) |
| POST | `/api/admin/users/import` | `ADMIN` | Admin | Bulk user creation via CSV |
| GET | `/api/admin/batches` | `ADMIN` / `INST` | Admin | List academic batches |
| POST | `/api/admin/assignments` | `ADMIN` / `INST` | Admin | Assign an exam to specific groups |
| GET | `/api/admin/exams/:id/live-monitor` | `ADMIN` / `INST` | Admin | WebSocket/SSE endpoint for live active sessions |
| POST | `/api/admin/colleges` | `ADMIN` | Admin | Register a new NCC unit/college |
| GET | `/api/materials` | Any | Materials | Download study materials (PDF/Video) |
| POST | `/api/admin/materials/bulk-verify` | `ADMIN` / `INST` | Materials | Approve uploaded study materials |
| GET | `/api/admin/logs` | `ADMIN` | Admin | View raw system audit logs |
| GET | `/api/admin/health` | `ADMIN` | SysOps | Liveness probe / stats check |

### Mobile Migration Constraints
1. **Multipart Forms:** Endpoints like `/api/exams/create-from-pdf` use `multer`. React Native `fetch` requires specific `FormData` construction for file uploads, and URI resolution from native file pickers (e.g. `expo-document-picker`) must extract the local `file://` blob correctly.
2. **WebSocket/SSE:** `/api/admin/exams/:id/live-monitor` relies on long-polling or WebSockets. React Native supports WebSockets natively, but SSE (Server-Sent Events) via `fetch` requires polyfills (`react-native-sse`) or specialized XMLHttpRequest wrappers.
3. **Deep Links:** Routes like `/api/auth/password/verify-token` are already compatible with `ncc-exam://` URI schemes, ensuring smooth handoff from email clients to the mobile application.
