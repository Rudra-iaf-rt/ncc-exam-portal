# NCC Exam Portal: Professional Technical Specification

A production-grade, proctored examination ecosystem designed for the National Cadet Corps (NCC). This platform provides secure, high-integrity assessment workflows with real-time proctoring, incremental persistence, and administrative analytics.

---

## Table of Contents
1. [Core Architecture](#core-architecture)
2. [Exam Lifecycle: End-to-End Flow](#exam-lifecycle-end-to-end-flow)
3. [Operational Modules](#operational-modules)
   - [Phase 1: Content Ingestion](#phase-1-content-ingestion)
   - [Phase 2: Targeted Assignment](#phase-2-targeted-assignment)
   - [Phase 3: Hardened Execution](#phase-3-hardened-execution)
   - [Phase 4: Integrity Audit](#phase-4-integrity-audit)
4. [Security & Proctoring Heuristics](#security--proctoring-heuristics)
5. [Production-Grade Infrastructure](#production-grade-infrastructure)
6. [Portal Feature Breakdown](#portal-feature-breakdown)
7. [Tech Stack](#tech-stack)
8. [API Reference Summary](#api-reference-summary)
9. [Installation & Deployment](#installation--deployment)

---

## Core Architecture

The system utilizes a 3-tier architecture designed for high availability and zero-trust security.

```ascii
 [ CLIENT TIER ]             [ SERVICES TIER ]            [ DATABASE TIER ]
 
 +--------------+            +----------------+           +----------------+
 | Admin Console|----------->|  Auth Service  |<--------->|  PostgreSQL    |
 | (React 19)   |            |  (JWT / OAuth) |           |  (Prisma ORM)  |
 +--------------+            +----------------+           +----------------+
                                     |                             |
 +--------------+            +----------------+           +----------------+
 | Cadet Portal |----------->|  Exam Engine   |<--------->|  Redis/Memory  |
 | (Mobile/Web) |            |  (Node.js/Exp) |           |  (Rate Limits) |
 +--------------+            +----------------+           +----------------+
                                     |
                             +----------------+           +----------------+
                             | Proctor Guard  |<--------->|  Audit Stream  |
                             | (Real-time)    |           |  (JSON Logs)   |
                             +----------------+           +----------------+
```

---

## Exam Lifecycle: End-to-End Flow

1. **Creation**: Admin/Instructor creates a master template (Manual/PDF/Excel).
2. **Sync**: Backend parses questions and stores them in the relational schema.
3. **Targeting**: Admin selects specific Colleges, Wings, or Batches for assignment.
4. **Notification**: Cadets receive active exam alerts on their dashboard.
5. **Lockdown**: Cadet starts the exam; the browser enters a proctored state.
6. **Persistence**: Answers are saved incrementally (1s debounce) to prevent data loss.
7. **Scoring**: System auto-scores MCQ questions upon submission or timeout.
8. **Audit**: Instructors review violation logs and finalize results.

---

## Operational Modules

### Phase 1: Content Ingestion
- **AI-PDF Extraction**: Leverages specialized text-parsing to convert standard question papers into structured database objects.
- **Excel Bulk Upload**: Supports standardized `.xlsx` templates for mass question ingestion.
- **Manual Editor**: A high-fidelity UI for building complex exams with multiple options and correct answer keys.

### Phase 2: Targeted Assignment
- **Granular Filtering**: Assign exams globally or filter by **College Code**, **Wing (Army/Navy/Air)**, or **Batch**.
- **Bulk Mapping**: Uses optimized database transactions to link thousands of cadets to a single exam instance in milliseconds.

### Phase 3: Hardened Execution
- **State Rehydration**: If a cadet's device crashes, they can resume from the last saved question and answer state.
- **Anti-Cheat Handshake**: Mandatory proctoring event listeners are initialized before the exam content is rendered.

### Phase 4: Integrity Audit
- **Violation Tracking**: Every "Security Breach" (tab switch, blur event) is logged with a high-precision timestamp.
- **Result Overrides**: Administrators can manually audit and adjust results if technical anomalies are detected.

---

## Security & Proctoring Heuristics

The portal implements browser-level security to maintain academic integrity:

- **Tab/App Detection**: Uses the `Page Visibility API` to detect when a cadet exits the exam screen.
- **Focus Guard**: Detects when the user clicks outside the browser or interacts with OS-level overlays.
- **Media Stream Enforcement**: Ensures a valid screen-share/camera stream is active for high-stakes assessments.
- **Auto-Submission**: The system triggers a hard submission if the violation count exceeds the defined threshold (Default: 3).

---

## Production-Grade Infrastructure

- **Tiered Rate Limiting**: Distinct memory buckets for **Auth** (12 req/m), **Exam Writes** (40 req/m), and **Proctoring Signals** (100 req/m).
- **Security Headers**: Standard production hardening including `X-Frame-Options: DENY` and `X-Content-Type-Options: nosniff`.
- **Stateless Scaling**: Session management via HTTP-only JWTs, allowing the backend to scale horizontally across multiple instances.
- **Audit Traceability**: Every database mutation is tagged with a `UUID v4` Request-ID for comprehensive forensic auditing.

---

## Portal Feature Breakdown

### Super Admin Console
- Global System Configuration.
- College & Staff Registry Management.
- High-level Performance Analytics across all units.

### Instructor (ANO) Portal
- Exam Lifecycle Management (Create -> Assign -> Result).
- Cadet Registry Management (CSV Import).
- Study Material Distribution (Google Drive Sync).
- Real-time Violation Monitoring.

### Cadet Interface
- Personalized Learning Dashboard.
- Secure Exam Sandbox with auto-save.
- Material Repository for field manuals.
- Performance Tracking & Result History.

---

## Tech Stack

| Tier | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TailwindCSS, Lucide-React, Vite |
| **Backend** | Node.js, Express, Prisma ORM, JWT |
| **Database** | PostgreSQL |
| **Mobile** | Expo / React Native |
| **DevOps** | Winston (Logging), Zod (Validation), Multer (Storage) |

---

## API Reference Summary

- `POST /api/auth/login` - Secure session initialization.
- `GET /api/exams/catalog` - Fetch assigned active assessments.
- `POST /api/exams/start` - Initialize proctored session handshake.
- `PATCH /api/exams/save` - Debounced incremental answer persistence.
- `POST /api/anti-cheat/violation` - Telemetry logging for proctoring events.

---

## Installation & Deployment

### 1. Requirements
- Node.js v18+
- PostgreSQL v14+

### 2. Backend Initialization
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### 3. Frontend Initialization
```bash
cd frontend
npm install
npm run dev
```

---
*Developed with Discipline and Engineering Precision for the National Cadet Corps.*