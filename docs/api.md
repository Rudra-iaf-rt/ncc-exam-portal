# NCC Exam Portal API Documentation

This document lists all active API endpoints available in the backend.

**Base URL**: `http://localhost:5000/api`

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
    "email": null,
    "role": "STUDENT",
    "college": "Example College"
  }
}
```

---

### POST /auth/login
Login for students using regimental number.

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "regimentalNumber": "NCC/2024/123",
    "password": "password123"
  }'
```

---

### POST /auth/login/staff
Login for Admins and Instructors using email.

---

### POST /auth/refresh
Refresh the access token using a refresh token stored in an httpOnly cookie.

**Response (200):**
```json
{
  "token": "eyJhbG..."
}
```

---

### POST /auth/logout
Clear session and revoke refresh token.

---

## 2. Portal Operations

### GET /exams
List available exams. 
- **Students**: Only see exams assigned to them.
- **Staff**: See all exams.

---

### GET /exams/:id
Get single exam with questions. Correct answers are stripped for students.

---

### POST /attempt/start
Start an exam attempt. Returns an existing one if already in progress.

---

### POST /attempt/:id/answer
Autosave a single answer.
**Request Body:** `{ "questionId": 1, "selectedAnswer": "Option A" }`

---

### POST /attempt/submit
Submit final exam answers and compute score.

---

### GET /results
Fetch examination history.
- **Students**: Returns their own scores.
- **Staff**: Returns all results.

---

### GET /materials
Fetch study resources and field manuals.

---

## Error Codes
- `400`: Bad Request (Validation failed)
- `401`: Unauthorized (Invalid or expired token)
- `403`: Forbidden (Insufficient permissions or not assigned)
- `404`: Not Found
- `409`: Conflict (Already submitted)
- `500`: Internal Server Error
