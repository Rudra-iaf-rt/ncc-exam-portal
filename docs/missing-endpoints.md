# Missing Backend Endpoints — NCC Exam Portal Admin---

## 1. User Management (Admin Only)

All 4 routes below require `ADMIN` role JWT.

---

### GET /api/admin/users

List all users in the system.

**Query params (optional):**
- `role` — filter by `STUDENT | ADMIN | INSTRUCTOR`
- `college` — filter by college name
- `page` / `limit` — pagination (default `page=1`, `limit=50`)

**Request:**
```bash
curl -X GET http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"
```

**Sample Response (200):**
```json
{
  "users": [
    {
      "id": 1,
      "name": "Cadet Arjun Rao",
      "regimentalNumber": "NCC-2024-001",
      "email": null,
      "role": "STUDENT",
      "college": "SV University"
    }
  ],
  "total": 120,
  "page": 1,
  "limit": 50
}
```

**Error Codes:** `401` (unauthenticated), `403` (non-admin)

---

### POST /api/admin/users

Create a new user (Cadet, Instructor, or Admin).

**Request:**
```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cadet Arjun Rao",
    "regimentalNumber": "NCC-2024-001",
    "email": null,
    "password": "cadet@123",
    "role": "STUDENT",
    "college": "SV University"
  }'
```

**Rules:**
- `regimentalNumber` required if `role === "STUDENT"`, else null
- `email` required if `role === "ADMIN" | "INSTRUCTOR"`, else null
- `password` min 6 chars

**Sample Response (201):**
```json
{
  "user": {
    "id": 42,
    "name": "Cadet Arjun Rao",
    "regimentalNumber": "NCC-2024-001",
    "email": null,
    "role": "STUDENT",
    "college": "SV University"
  }
}
```

**Error Codes:** `400` (validation), `401`, `403`, `409` (duplicate regimentalNumber/email)

---

### PATCH /api/admin/users/:id

Update an existing user's details or enable/disable their account.

**Request:**
```bash
curl -X PATCH http://localhost:3000/api/admin/users/42 \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "college": "New College",
    "disabled": true
  }'
```

**Notes:**
- Only provided fields are updated (partial update)
- `disabled: true` blocks login for the user
- Password change should be a separate endpoint (or require `currentPassword` confirmation)
- Role changes take immediate effect

**Sample Response (200):**
```json
{
  "user": {
    "id": 42,
    "name": "Updated Name",
    "college": "New College",
    "role": "STUDENT",
    "disabled": true
  }
}
```

**Error Codes:** `400`, `401`, `403`, `404` (user not found)

> **Schema note:** The current `User` Prisma model does not have a `disabled` field. Add: `disabled Boolean @default(false)` and check it in the `authenticate` middleware.

---

### DELETE /api/admin/users/:id

Soft-delete a user (preserves exam attempt history).

**Request:**
```bash
curl -X DELETE http://localhost:3000/api/admin/users/42 \
  -H "Authorization: Bearer <admin_token>"
```

**Rules:**
- Users with `Attempt` or `Result` records → soft delete only (set `disabled: true`)
- Users with no records → can be hard deleted
- Admin cannot delete themselves

**Sample Response (200):**
```json
{
  "message": "User disabled (soft deleted — existing results preserved)",
  "userId": 42
}
```

**Error Codes:** `401`, `403`, `404`, `409` (cannot delete self)

---

## 2. Exam Detail — Admin View

The current `GET /api/exams/:id` route is locked behind `requireStudent` middleware.
Admin needs to view full exam detail **including correct answers** for moderation.

---

### GET /api/admin/exams/:id

Return full exam detail with correct answers (admin only).

**Request:**
```bash
curl -X GET http://localhost:3000/api/admin/exams/5 \
  -H "Authorization: Bearer <admin_token>"
```

**Sample Response (200):**
```json
{
  "exam": {
    "id": 5,
    "title": "NCC Common Proficiency Test 2024",
    "duration": 60,
    "createdBy": 2,
    "creatorName": "ANO Sharma",
    "questions": [
      {
        "id": 101,
        "question": "What is the NCC motto?",
        "options": ["Unity and Discipline", "Serve and Lead", "Faith and Knowledge", "Duty and Honor"],
        "answer": "Unity and Discipline"
      }
    ]
  }
}
```

**Error Codes:** `401`, `403`, `404`

---

## 3. Exam Management (Edit / Delete)

---

### PATCH /api/admin/exams/:id

Update exam title or duration (before any attempts are made).

**Request:**
```bash
curl -X PATCH http://localhost:3000/api/admin/exams/5 \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Exam Title",
    "duration": 90
  }'
```

**Rules:**
- If any `Attempt` exists for this exam → reject edit (return 409)
- Only ADMIN or the exam creator (INSTRUCTOR) can edit

**Sample Response (200):**
```json
{
  "exam": {
    "id": 5,
    "title": "Updated Exam Title",
    "duration": 90
  }
}
```

**Error Codes:** `400`, `401`, `403`, `404`, `409` (attempts exist)

---

### DELETE /api/admin/exams/:id

Delete an exam and cascade-delete its questions, attempts, and results.

**Request:**
```bash
curl -X DELETE http://localhost:3000/api/admin/exams/5 \
  -H "Authorization: Bearer <admin_token>"
```

**Rules:**
- Cascade delete is already set up in Prisma schema (`onDelete: Cascade`)
- Audit log the deletion (who deleted, when, exam title)
- Only ADMIN can delete (not INSTRUCTOR)

**Sample Response (200):**
```json
{
  "message": "Exam deleted successfully",
  "examId": 5
}
```

**Error Codes:** `401`, `403`, `404`

---

## 4. Refresh Token

The PRD specifies a refresh token flow (`POST /auth/refresh`). It is not implemented.

---

### POST /api/auth/refresh

Exchange a refresh token for a new access token.

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refresh_token>"
  }'
```

**Implementation notes:**
- Issue `refreshToken` (long-lived, 7d) alongside `token` (short-lived, 1h) on login
- Store refresh tokens in DB or signed-cookie (not localStorage)
- Validate: token must exist, not expired, not revoked
- On success: issue new access token

**Sample Response (200):**
```json
{
  "token": "<new_access_token>"
}
```

**Error Codes:** `400` (missing refresh token), `401` (invalid/expired)

> **Current workaround in Admin frontend:** Token expiry results in logout. The UI shows a session-expired toast and redirects to `/admin/login`. This is acceptable for MVP.

---

## Impact Summary

| Feature | Blocked By |
|---------|-----------|
| User list / create / edit | Missing `GET/POST/PATCH/DELETE /api/admin/users` |
| Exam detail view (admin) | Missing `GET /api/admin/exams/:id` |
| Exam edit / delete | Missing `PATCH/DELETE /api/admin/exams/:id` |
| Session persistence | Missing `POST /api/auth/refresh` |
