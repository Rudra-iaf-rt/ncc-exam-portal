# NCC Exam Portal API Documentation

This document lists all active API endpoints available in the backend.

**Base URL**: `http://localhost:3000/api`

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

**Response (200):**
```json
{
  "token": "eyJhbG...",
  "user": { ... }
}
```

---

### POST /auth/login/staff
Login for Admins and Instructors using email.

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/login/staff \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ncc.in",
    "password": "adminpassword"
  }'
```

**Response (200):**
```json
{
  "token": "eyJhbG...",
  "user": { ... }
}
```

---

### GET /auth/me
Get current authenticated user profile.

**Request:**
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <token>"
```

**Response (200):**
```json
{
  "user": { ... }
}
```

---

## 2. Exams

### GET /exams
List all exams with question counts. Correct answers are stripped.

**Request:**
```bash
curl -X GET http://localhost:3000/api/exams \
  -H "Authorization: Bearer <token>"
```

**Response (200):**
```json
{
  "exams": [
    {
      "id": 1,
      "title": "B Certificate Exam",
      "duration": 60,
      "questionCount": 50
    }
  ]
}
```

---

### POST /exams/create
Create a new exam (Admin/Instructor only).

**Request:**
```bash
curl -X POST http://localhost:3000/api/exams/create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "C Certificate Exam 2024",
    "duration": 120,
    "questions": [
      {
        "question": "What is the motto of NCC?",
        "options": ["Unity and Discipline", "Service Before Self", "Duty and Honor", "Valour"],
        "answer": "Unity and Discipline"
      }
    ]
  }'
```

**Response (201):**
```json
{
  "exam": {
    "id": 2,
    "title": "C Certificate Exam 2024",
    "duration": 120,
    "createdBy": 1,
    "questions": [ ... ]
  }
}
```

---

### GET /exams/:id
Get single exam with questions (Student only).

**Request:**
```bash
curl -X GET http://localhost:3000/api/exams/1 \
  -H "Authorization: Bearer <token>"
```

---

### POST /attempt/start
Start an exam attempt (Student only).

**Request:**
```bash
curl -X POST http://localhost:3000/api/attempt/start \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "examId": 1 }'
```

---

### POST /attempt/submit
Submit an exam attempt (Student only).

**Request:**
```bash
curl -X POST http://localhost:3000/api/attempt/submit \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "examId": 1,
    "answers": [
      { "questionId": 1, "selectedAnswer": "Unity and Discipline" }
    ]
  }'
```

---

## 3. Results

### GET /results/admin
Fetch all results across all colleges (Admin only).

**Request:**
```bash
curl -X GET http://localhost:3000/api/results/admin \
  -H "Authorization: Bearer <admin_token>"
```

**Response (200):**
```json
{
  "results": [
    {
      "id": 1,
      "score": 85,
      "examId": 1,
      "examTitle": "B Certificate",
      "studentId": 4,
      "studentName": "Rahul Kumar",
      "regimentalNumber": "NCC/24/004",
      "college": "A-College"
    }
  ]
}
```

---

### GET /results/instructor
Fetch results for students in the instructor's college.

**Request:**
```bash
curl -X GET http://localhost:3000/api/results/instructor \
  -H "Authorization: Bearer <instructor_token>"
```

---

### GET /results/student
Fetch own results.

**Request:**
```bash
curl -X GET http://localhost:3000/api/results/student \
  -H "Authorization: Bearer <student_token>"
```
