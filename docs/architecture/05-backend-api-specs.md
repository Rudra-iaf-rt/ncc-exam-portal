# Chapter 5: Backend API Specifications

The Express API is strictly stateless. Controllers handle the HTTP lifecycle, Services contain business logic, and Prisma handles persistence.

## 5.1 The Request Lifecycle

Every API request follows a strict funnel:
1. **Global Middleware:** Request-ID generation, Helmet security headers, CORS boundaries.
2. **Rate Limiting:** IP-based request tracking.
3. **Authentication Guard:** Verifies JWT and extracts user context.
4. **Validation Guard (Zod):** Asserts the request body structure.
5. **Controller -> Service:** Execution of logic.
6. **Global Error Handler:** Catches thrown exceptions, strips stack traces in production, and maps standard error codes to HTTP status responses.

## 5.2 Critical Exam Execution Endpoints

### 5.2.1 `POST /api/exams/startAttempt`
- **Purpose:** Initializes the exam session for a Cadet.
- **Rate Limit:** 10 req/min
- **Logic:** 
  1. Checks if the Cadet is explicitly assigned to the `examId`.
  2. Asserts the current server time falls between the Exam's `startAt` and `endAt` windows.
  3. Checks if an `Attempt` already exists. If yes, it returns the existing attempt (Rehydration).
  4. If new, generates `expiresAt` (Server Time + Exam Duration).
- **Response:** Returns the full attempt state, `expiresAt`, and the list of questions (stripped of correct answers).

### 5.2.2 `PATCH /api/exams/saveAnswer`
- **Purpose:** The high-frequency incremental persistence route.
- **Rate Limit:** 60 req/min (Allows for 1 request per second).
- **Payload:** `{ examId: number, answers: object }`
- **Logic:**
  1. Service fetches the `Attempt`.
  2. Validates that the current server time is `< attempt.expiresAt`.
  3. Updates the `JSONB` answers column.
- **Resilience:** If this request fails (e.g., 502 Bad Gateway), the frontend does not crash; it silently queues the answer and retries in the next 1000ms loop.

### 5.2.3 `POST /api/exams/submit`
- **Purpose:** Finalizes the exam and locks the state.
- **Logic:**
  1. Transitions `Attempt` status to `SUBMITTED`.
  2. Iterates over the `JSONB` answers, comparing them against the authoritative `Question` correct options.
  3. Calculates score utilizing `positiveMarks` and `negativeMarks` (if `negativeMarking` is true).
  4. Generates a `Result` record.
  5. Records an `ATTEMPT_SUBMIT` action in the `AuditLog`.

## 5.3 Administrative Endpoints

### 5.3.1 Content Ingestion (`POST /api/exams/createFromPdf`)
- **Payload:** `multipart/form-data` containing the PDF binary buffer.
- **Logic:** Passes the buffer to an extraction service (AI or RegExp-based parsing) to convert raw unstructured text into structured `Question` entities with distinct options and answer keys.

### 5.3.2 Remote Session Termination (`POST /api/exams/terminateSession`)
- **Purpose:** Allows an ANO/Instructor to forcefully close a Cadet's exam if severe physical cheating is observed on the ground.
- **Logic:** Instantly overwrites the Cadet's `Attempt.status` to `SUBMITTED` and logs a specialized `ExamViolation` with the Instructor's provided reasoning.
