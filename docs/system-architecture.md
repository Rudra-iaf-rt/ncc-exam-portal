# Technical Design Document (TDD)
## NCC Examination Portal (Highly Detailed Architecture)

**Document Status:** FINAL  
**Version:** 2.0  
**Classification:** Internal / Confidential  

---

## 1. Executive Summary

### 1.1 Business Context
The National Cadet Corps (NCC) Examination Portal is an enterprise-grade digital evaluation ecosystem designed to modernize and secure cadet assessments. It transitions operations from manual, error-prone paper testing to a high-integrity, real-time proctored environment capable of hierarchical targeting across Colleges, Wings, and Batches.

### 1.2 Strict Scale & Reliability Targets
The architecture ensures stringent performance SLAs under high-stakes conditions:
- **Concurrency & Scaling:** Sustained 3,000 concurrent users, tested up to 9,000 users during spike events.
- **API Performance (p95 latency):** < 300ms under normal load; < 800ms during maximum spike.
- **Availability Target:** 99.5% monthly uptime.
- **Absolute Data Integrity:** Incremental state persistence guarantees zero data loss during unpredictable client-side crashes or rural network partitions.

---

## 2. Infrastructure & Deployment Architecture

The infrastructure runs on Dockerized containers managed via `docker-compose`, establishing isolated networking for the web, persistence, and caching layers.

### 2.1 Container Specifications
- **Database (`db`):** `postgres:15-alpine` running on port 5432, utilizing persistent Docker volumes (`postgres_data`) to ensure state survival across reboots.
- **Caching/Queueing (`redis`):** `redis:7-alpine` running on port 6379, providing sub-millisecond in-memory stores for rate-limiting and active session telemetry.
- **Backend API (`backend`):** Node.js runtime executing on port 3000. Configured with strict production environment variables (`NODE_ENV=production`) and parameterized feature flags.
- **Frontend SPA (`frontend`):** Vite-compiled React SPA running on port 5173, consuming the backend API strictly over the internal container network mapping (`VITE_API_URL=http://localhost:3000`).

### 2.2 Critical Environment Configurations (Feature Flags)
The system leverages runtime feature flags for zero-downtime behavioral changes:
- `FEATURE_COOKIE_AUTH`: Toggles strict HTTP-Only cookie adherence.
- `FEATURE_STRICT_EXAM_SESSION`: Enforces strict singleton session rules per cadet.
- `FEATURE_TIMEOUT_AUTO_CLOSE`: Enables the server-side cron to forcefully finalize expired attempts.
- `FEATURE_SOFT_DELETE_USERS`: Mitigates cascading deletions to preserve historical audit logs.

---

## 3. Data Architecture (Prisma ORM)

The relational schema is meticulously designed in PostgreSQL (via Prisma) to avoid massive joins during high-frequency writes.

### 3.1 Exhaustive Entity Mapping

#### Identity & Hierarchy
- **User Model:** Serves as the central identity. Contains `regimentalNumber` (Unique), `email`, `role`, `batch`, `wing`, and `collegeCode` (Foreign Key). Indexed on `[role, isActive]` and `[role, collegeCode]` for sub-50ms lookup times during bulk assignments.
- **College Model:** Maps structural entities (`code`, `name`, `address`).

#### Examination & Content
- **Exam Model:** Defines the assessment configuration (`duration`, `positiveMarks`, `negativeMarks`, `status`). 
- **Question Model:** Houses the specific `question`, `options` array, and the correct `answer`.
- **ExamAssignment Model:** A high-throughput join table created in bulk (using `createMany`) that maps thousands of `Users` to an `Exam`.

#### Execution & State (The Critical Path)
- **Attempt Model:** The most write-heavy table. 
  - Tracks `studentId`, `examId`, `startedAt`, `expiresAt`, `status`.
  - **JSONB Column (`answers`)**: Crucial optimization. Instead of a relational `Answer` table (which would generate millions of rows and trigger N+1 insert bottlenecks), the answers are serialized as a lightweight JSON object updated incrementally via `PATCH`.

#### Audit & Proctoring
- **ExamViolation:** Logs heuristic breaches (e.g., Tab switching) associated with a `studentId` and `examId`.
- **ExamHeartbeat:** A real-time ping table ensuring the cadet is actively connected.
- **AuditLog:** An immutable global ledger logging all administrative actions (`action`, `entityType`, `metadata`, `ip`, `statusCode`).

---

## 4. API Services & Core Workflows

The backend (`Node.js/Express`) acts as the single source of truth. All logic is encapsulated in distinct Controller-Service boundaries.

### 4.1 Exam Ingestion & Creation
The API supports multi-modal content ingestion to ease administrative friction:
- **`POST /api/exams/createFromPdf`:** Parses raw PDF buffers utilizing AI text extraction to auto-generate structured `Question` entities.
- **`POST /api/exams/createFromExcel`:** Processes bulk `.xlsx` template uploads for massive question ingestion.
- **Audit Trace:** Every creation event records an `EXAM_CREATE` action in the `AuditLog`.

### 4.2 Exam Execution Lifecycle (The Cadet Path)
1. **Initiation (`POST /api/exams/startAttempt`):** 
   - Validates eligibility.
   - Calculates absolute `expiresAt` based on server time (rejecting client-side clocks).
   - Generates the initial `Attempt` record.
2. **Incremental State Sync (`PATCH /api/exams/saveAnswer` & `syncAnswers`):**
   - The frontend React application triggers a debounced (1s) payload containing the cadet's current selected option.
   - The backend specifically patches the JSONB `answers` column and updates the `lastSavedAt` timestamp.
3. **Termination (`POST /api/exams/submit`):**
   - Calculates the final score against the `Question` correct options.
   - Emits a synchronous `ATTEMPT_SUBMIT` audit log.

### 4.3 Administrator Operations
- **`POST /api/exams/updateMeta` & `replaceQuestions`:** Enables non-destructive editing of DRAFT exams.
- **`POST /api/exams/extendTime` & `resetAttempt`:** Administrator overrides to manage technical anomalies on the field.
- **`POST /api/exams/terminateSession`:** Manual triggering of remote session termination by the ANO based on real-time violation monitoring.

---

## 5. Security Protocols & Heuristic Proctoring

### 5.1 Telemetry & Anti-Cheat Guards
- **Event Listeners:** The frontend DOM hooks into `visibilitychange` (Tab Switching) and `blur` (Focus Loss).
- **Heuristic Processing:** Events fire to the `anti-cheat` API. The backend increments the `warningCount` on the `Attempt`. If the threshold is breached, the session is forcibly closed.

### 5.2 Zero-Trust Security
- **Strict Role-Based Routing:** Express middleware layer explicitly asserts token validity against `RequireAdmin`, `RequireStaff`, or `RequireCadet` guards before controller execution.
- **JWT Refresh Strategy:** Short-lived access tokens combined with a `RefreshToken` model that includes revocation capabilities (`revokedAt`).
- **Data Validation:** Exhaustive input validation via `Zod` blocks NoSQL/SQL injections and malformed JSON payloads prior to hitting the `examService` layer.

---

## 6. Known Constraints & Future Scaling
- **Aggregation Bottlenecks:** The `/api/results` endpoint currently calculates college-wide averages synchronously. If data exceeds millions of rows, this will require migration to Materialized Views in PostgreSQL or background processing via BullMQ.
- **Database Connection Sizing:** Relies on aggressive connection pooling (e.g., PgBouncer logic) to prevent connection starvation during a 9,000-user initialization spike.
