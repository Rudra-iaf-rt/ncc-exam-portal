# NCC Exam Portal API Documentation

This document lists all active API endpoints available in the backend.

**Base URL**: `http://localhost:3000/api`

> [!IMPORTANT]
> **Default Seed Credentials (Development)**
> - **Student**: `STU001` / `student123`
> - **Admin**: `admin@example.com` / `admin123`
> - **Instructor**: `instructor@example.com` / `admin123`

---

## 1. Authentication

### POST /auth/register
Register a new student account.

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "regimentalNumber": "NCC/2024/123",
    "password": "password123",
    "college": "Example College"
  }'
```

**Response (201):**
```json
{
  "token": "eyJhbG...",
  "user": {
    "id": 1,
    "name": "Jane Doe",
    "regimentalNumber": "NCC/2024/123",
    "role": "STUDENT",
    "college": "Example College"
  }
}
```

---

### POST /auth/login
Login for students using regimental number.

---

### POST /auth/login/staff
Login for Admins and Instructors using email.

---

### GET /auth/me
Get current authenticated user profile.

---

## 2. Exams (Catalog & Management)

### GET /exams
List available exams. 
- **Students**: Only see exams assigned to them that are LIVE.
- **Staff**: See all exams in the catalog.

---

### POST /exams/create
Create a new exam (Admin/Instructor only).

---

### PATCH /exams/:id/publish
Change exam status to LIVE (Admin/Instructor only).

---

## 3. Exam Attempts (Student)

### POST /attempt/start
Start or resume an exam attempt. Returns the exam details and existing answers.

**Request:**
```json
{ "examId": 1 }
```

**Response (200/201):**
```json
{
  "attemptId": 123,
  "exam": { "id": 1, "title": "...", "questions": [...] },
  "answers": { "101": "Option A" },
  "currentQuestionIndex": 5,
  "remainingSeconds": 3600
}
```

---

### POST /attempt/answer
Autosave a single answer and/or sync navigation progress.

**Request:**
```json
{
  "examId": 1,
  "questionId": 101, 
  "selectedAnswer": "Option B",
  "nextQuestionIndex": 6
}
```
*Note: `questionId` and `selectedAnswer` are optional if only updating the index.*

---

### POST /attempt/submit
Submit final exam answers and compute score.

---

### POST /exam/violation
Log a proctoring security breach.

**Request:**
```json
{
  "examId": 1,
  "type": "TAB_SWITCH"
}
```

**Response (200):**
```json
{
  "warningCount": 1,
  "terminate": false
}
```

---

## 4. Results

### GET /results
Fetch examination history.
- **Students**: Returns their own scores.
- **Staff**: Returns all results (filtered by college for instructors).

---

### GET /results/admin
Fetch all results across all colleges (Admin only).

---

## Error Codes
- `400`: Bad Request (Validation failed)
- `401`: Unauthorized (Invalid or expired token)
- `403`: Forbidden (Insufficient permissions)
- `404`: Not Found
- `409`: Conflict (Already submitted)
- `500`: Internal Server Error
