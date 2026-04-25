# NCC Examination System – Full Product Requirement Document (PRD)

## 1. Overview

The NCC Examination System is a centralized digital platform for the Tirupati NCC unit to conduct, manage, and evaluate cadet examinations.

The system supports:

* Role-based access (Cadet, Officer, Admin)
* Secure online examinations
* Real-time result generation
* Multi-college coordination

---

## 2. Objectives

### Primary Goals

* Conduct reliable online exams
* Ensure one attempt per cadet
* Maintain data integrity under failure scenarios

### Secondary Goals

* Provide study materials
* Offer analytics and performance insights

---

## 3. User Roles & Permissions

### 3.1 Cadet

* Login via Regimental Number + Password
* View eligible exams
* Attempt exams
* View results

### 3.2 Officer (College Admin / ANO)

* Create and manage exams
* Upload questions
* View student results (college-level)

### 3.3 Admin (Unit HQ)

* Manage users (cadets & officers)
* View system-wide analytics
* Export results

---

## 4. System Architecture (Aligned)

* Frontend: React (Web) + React Native (Mobile – Phase 2)
* Backend: Express REST API
* ORM: Prisma
* Database: PostgreSQL
* Authentication: JWT + Refresh Tokens

Backend is the **single source of truth**.

---

## 5. Core Modules

---

## 5.1 Authentication Module

### Features

* Login (Cadet: Regimental No, Officer/Admin: Email)
* JWT-based auth
* Refresh token mechanism
* Logout

### Rules

* Token expiry enforced
* Role embedded in token

### Edge Cases

* Invalid credentials → error
* Token expired mid-session → refresh flow
* Disabled user → block access
* Multiple logins → allowed but tracked

---

## 5.2 User Management

### Features

* Admin creates users
* Assign roles and colleges
* Enable/disable accounts

### Edge Cases

* Duplicate regimental number → reject
* Deleting user with attempts → soft delete
* Role change → immediate effect

---

## 5.3 Exam Management

### Features

* Create exam:

  * title
  * duration
  * startAt / endAt
* Add questions (MCQ)
* Publish exam

### Rules

* Only published exams are visible
* Exams are time-bound

### Edge Cases

* Exam edited after publish → restrict or version
* Overlapping exams → allowed

---

## 5.4 Eligibility System

### MVP Implementation

* Explicit assignment:

  * `ExamAssignment (userId, examId)`

### Rules

* Only assigned cadets can see exam
* Unassigned → hidden

### Edge Cases

* Removed after assignment → revoke access
* Late assignment → allowed if within time window

---

## 5.5 Exam Attempt System (CORE)

### Attempt Lifecycle States

```
NOT_STARTED → IN_PROGRESS → SUBMITTED / TIMED_OUT
```

---

### Flow

1. Cadet clicks "Start Exam"
2. Backend:

   * checks eligibility
   * checks existing attempt
   * creates Attempt
3. Returns:

   * questions (without correct answers)
   * expiresAt timestamp

---

### Data Fields (Critical)

* startedAt
* expiresAt
* lastSavedAt
* status
* sessionId

---

### Rules

* One attempt per cadet per exam
* Timer enforced by backend
* Answers saved incrementally
* Submission is idempotent

---

### Edge Cases

#### Attempt Start

* Already attempted → block
* Exam expired → block

#### During Exam

* Refresh → resume attempt
* Multiple tabs → sessionId validation
* Token expiry → refresh token flow

#### Timer

* Client timer mismatch → backend authoritative
* Late entry → reduced remaining time

#### Network Issues

* Answers auto-save periodically
* Retry on failure

#### Submission

* Double submit → return existing result
* Network failure during submit → retry safely

---

## 5.6 Anti-Cheat (Basic – MVP)

### Features

* Tab switch detection (client-side only)
* Fullscreen prompt

### Limitations

* Cannot fully prevent cheating
* Mobile restrictions

---

## 5.7 Result Module

### Features

* Auto evaluation (server-side)
* Instant result display
* Role-based access

### Rules

* Results immutable after submission
* Admin override allowed (logged)

### Edge Cases

* Partial answers → evaluated
* Re-submission attempt → ignored

---

## 5.8 Study Materials

### Features

* Upload PDFs/videos
* Categorize by subject

### Edge Cases

* Large upload failure
* Unauthorized access

---

## 6. API Design Principles

* REST-based endpoints
* Role-based authorization
* Consistent response format

### Critical APIs

* POST /auth/login
* POST /auth/refresh
* GET /exams
* POST /attempt/start
* POST /attempt/:id/answer
* POST /attempt/:id/submit
* GET /attempts/active

---

## 7. Data Integrity Rules

* Unique attempt constraint (examId + userId)
* Server-controlled scoring
* No client-side trust

---

## 8. Security Considerations

* JWT validation on every request
* Role-based middleware
* Input validation (Zod)
* Rate limiting

---

## 9. Performance Requirements

* Handle 100–500 concurrent users
* Response time < 300ms
* Scalable DB queries

---

## 10. MVP Scope (STRICT)

### MUST INCLUDE

* Authentication
* Exam creation
* Exam attempt
* Result display

### EXCLUDE (Phase 2)

* Advanced analytics
* Strong anti-cheat
* Mobile app exam flow
* Offline mode

---

## 11. Known Risks

* Cheating cannot be fully prevented
* Network instability during exams
* Token expiry during attempts
* Server load spikes

---
## 12. Future Enhancements

* AI-based proctoring
* Mobile-first app
* Advanced analytics dashboard
* Offline sync capability
---

## Final Principle

This system must prioritize:

1. Reliability over features
2. Backend authority over frontend logic
3. Simplicity over overengineering

Failure to control scope will result in system instability.