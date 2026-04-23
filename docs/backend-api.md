# NCC Exam Portal Backend API Contract

Base URL: `/api`  
Auth: Bearer JWT in `Authorization: Bearer <token>` unless endpoint is public.

## Roles

- `STUDENT`
- `INSTRUCTOR`
- `ADMIN`

## Health

- `GET /health` - public health check
  - Response: `{ "ok": true }`

---

## 1) Auth Module

Prefix: `/api/auth`

- `POST /register` (public, rate-limited)
  - Body: `{ name, regimentalNumber, email, mobile, college, batch, year, password }`
  - Response: `{ token, refreshToken, user }`

- `POST /login` (public, rate-limited, student login alias)
- `POST /login/student` (public, rate-limited)
  - Body: `{ regimentalNumber, password }`
  - Response: `{ token, refreshToken, user }`

- `POST /login/staff` (public, rate-limited)
  - Body: `{ email, password }`
  - Response: `{ token, refreshToken, user }`

- `GET /me` (authenticated)
  - Response: `{ user }`

- `GET /refresh` (authenticated, rate-limited, legacy access-token refresh)
  - Response: `{ token, refreshToken, user }`

- `POST /refresh` (public, rate-limited, refresh-token rotation)
- `POST /refresh-token` (alias)
  - Body: `{ refreshToken }`
  - Response: `{ token, refreshToken, user }`

- `POST /logout` (authenticated)
  - Body: `{ refreshToken }`
  - Response: `{ ok: true }`

- `POST /password/forgot` (public, rate-limited)
- `POST /forgot-password` (alias)
  - Body: `{ email }`
  - Response: `{ ok: true }`

- `POST /password/reset` (public, rate-limited)
- `POST /reset-password` (alias)
  - Body: `{ token, newPassword }`
  - Response: `{ ok: true }`

---

## 2) User Management (Admin)

- `POST /users/create-instructor` (`ADMIN`)
  - Body: `{ name, email, password, college }`
  - Response: `{ user }`

- `GET /users/instructors` (`ADMIN`)
  - Response: `{ users: [...] }`

- `GET /users/all` (`ADMIN`)
  - Query: optional `role`
  - Response: `{ users: [...] }`

- `GET /users/:id` (`ADMIN`)
  - Response: `{ user }`

- `DELETE /users/:id` (`ADMIN`)
  - Response: `{ id }`

- `POST /users/:id/reset-password` (`ADMIN`)
  - Body: `{ newPassword }`
  - Response: `{ ok: true }`

---

## 3) Materials Module

- `POST /material/upload` (`ADMIN` or `INSTRUCTOR`)
  - Multipart field: `file`, optional body `title`
  - Max size: 25 MB
  - Response: `{ material }`

- `GET /materials` (authenticated)
  - Response: `{ materials: [...] }`

- `GET /materials/:id` (authenticated)
  - Response: `{ material }`

- `GET /materials/:id/download` (authenticated)
  - Response: file stream

- `DELETE /materials/:id` (`ADMIN` or `INSTRUCTOR`)
  - Response: `{ id }`

---

## 4) Exam Module

- `POST /exams/create` (`ADMIN` or `INSTRUCTOR`)
  - Body: `{ title, duration, questions[] }`
  - Response: `{ exam }`

- `POST /exams/create-from-pdf` (`ADMIN` or `INSTRUCTOR`)
  - Multipart field: `pdf`
  - Body: `{ title, duration }`
  - Response: `{ exam }`

- `POST /exams/create-from-excel` (`ADMIN` or `INSTRUCTOR`)
  - Multipart field: `file` (`.xlsx/.xls/.csv`)
  - Body: `{ title, duration }`
  - Response: `{ exam }`

- `GET /exams` (authenticated)
  - Response: `{ exams: [...] }` (includes `published`, `publishedAt`)

- `GET /exams/:id` (`STUDENT`)
  - Returns exam without answers
  - Requires exam to be published

- `GET /staff/exams/:id` (`ADMIN` or `INSTRUCTOR`)
  - Response: `{ exam }` (includes answers)

- `PUT /exams/:id` (`ADMIN` or `INSTRUCTOR`, creator-only)
  - Body: `{ title?, duration? }`
  - Response: `{ exam }`

- `PUT /exams/:id/questions` (`ADMIN` or `INSTRUCTOR`, creator-only)
  - Body: `{ questions: [...] }`
  - Response: `{ exam }`

- `PATCH /exams/:id/publish` (`ADMIN` or `INSTRUCTOR`, creator-only)
  - Response: `{ exam }`

- `DELETE /exams/:id` (`ADMIN` or `INSTRUCTOR`, creator-only)
  - Response: `{ id }`

---

## 5) Attempt Module

- `POST /attempt/start` (`STUDENT`)
  - Body: `{ examId }`
  - Response: `{ attemptId, exam, answers, currentQuestionIndex }`

- `POST /attempt/answer` (`STUDENT`, rate-limited)
- `POST /attempt/save-progress` (alias)
  - Body: `{ examId, questionId, selectedAnswer, nextQuestionIndex }`
  - Response: `{ answers, currentQuestionIndex, answeredCount, totalQuestions }`

- `POST /attempt/submit` (`STUDENT`, rate-limited)
- `POST /exams/submit` (alias)
  - Body: `{ examId, answers? }`
  - Response: `{ score, correct, total }`

- `GET /attempt/status/:examId` (`STUDENT`)
  - Response: `{ attemptId, examId, status, currentQuestionIndex, answeredCount, totalQuestions, updatedAt }`

- `GET /attempt/details/:attemptId` (`STUDENT`)
  - Response: `{ id, examId, status, currentQuestionIndex, answers, exam, createdAt, updatedAt }`

---

## 6) Anti-Cheat Module

- `POST /exam/violation` (`STUDENT`, rate-limited)
  - Body: `{ examId, type, message? }`
  - Response: violation row

- `POST /exam/heartbeat` (`STUDENT`, rate-limited)
  - Body: `{ examId, activeQuestionIndex? }`
  - Response: heartbeat row

- `GET /exam/flags/:examId` (`ADMIN` or `INSTRUCTOR`)
  - Response: `{ flags: [...] }`

---

## 7) Results Module

- `GET /results/student` (`STUDENT`)
  - Query: optional `examId`
  - Response: `{ results: [...] }`

- `GET /results/instructor` (`INSTRUCTOR`)
  - Query: optional `examId`, optional `college`
  - Response: `{ college, results: [...] }`

- `GET /results/admin` (`ADMIN`)
  - Query: optional `examId`, optional `college`
  - Response: `{ results: [...] }`

- `GET /results/summary/:examId` (`ADMIN` or `INSTRUCTOR`)
  - Response: `{ examId, title, attempts, averageScore, highestScore, lowestScore }`

- `GET /results/export/:examId` (`ADMIN` or `INSTRUCTOR`)
  - Response: CSV file download

---

## 8) Notifications Module

- `POST /notifications/send` (`ADMIN` or `INSTRUCTOR`)
  - Body: `{ message, userId? }` (`userId` omitted/null means broadcast)
  - Response: notification row

- `GET /notifications` (authenticated)
  - Response: `{ notifications: [...] }`

---

## 9) Admin / System Module

Prefix: `/api/admin` (`ADMIN`)

- `GET /stats`
- `GET /dashboard` (alias)
  - Response: dashboard metrics + recent activity

- `GET /users`
  - Response: user registry list

- `GET /health`
  - Response: `{ ok: true, service: "admin" }`

- `GET /logs`
  - Query: optional `limit`, optional `action`
  - Response: `{ logs: [...] }`

---

## Common Error Response

For validation/auth/role/business errors:

```json
{ "error": "message" }
```

Typical codes: `400`, `401`, `403`, `404`, `409`, `429`, `500`.
