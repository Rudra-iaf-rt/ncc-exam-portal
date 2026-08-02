# Chapter 4: Data Architecture & Prisma Schema

The NCC Exam Portal uses a highly normalized relational structure managed by PostgreSQL and Prisma ORM, mixed with strategic denormalization (JSONB) to optimize critical write paths.

## 4.1 Schema Overview

The database acts as the ultimate authority. No client-side state is trusted. The schema focuses on strict data integrity, utilizing Foreign Keys with `Cascade` delete strategies only where it does not impact auditability.

## 4.2 Core Entity Models & Rationale

### 4.2.1 The Identity Layer (`User`, `College`, `Batch`)
```prisma
model User {
  id                    Int                  @id @default(autoincrement())
  regimentalNumber      String?              @unique
  role                  String
  collegeCode           String?
  ...
  @@index([role, isActive])
  @@index([role, collegeCode])
}
```
**Architectural Decision:** `regimentalNumber` acts as the unique identifier for Cadets, but is nullable because `Staff` and `Admin` accounts rely on email authentication. The composite indices (`@@index([role, collegeCode])`) are critical. When assigning an exam to 2,000 cadets in a specific college, this index allows the database to locate the subset in `< 10ms`.

### 4.2.2 The Assessment Layer (`Exam`, `Question`, `ExamAssignment`)
```prisma
model Exam {
  id          Int       @id @default(autoincrement())
  title       String
  duration    Int
  status      String    @default("DRAFT")
  ...
}
```
**Architectural Decision:** Exams are state machines (`DRAFT` -> `PUBLISHED` -> `ARCHIVED`). `ExamAssignments` dictate who can see the exam. Instead of iterating in Node.js to create assignments, the system uses `prisma.examAssignment.createMany` to push the entire batch operation down to the PostgreSQL engine, avoiding ORM overhead.

### 4.2.3 The Critical Write Path (`Attempt`)
```prisma
model Attempt {
  id                   Int      @id @default(autoincrement())
  studentId            Int
  examId               Int
  status               String
  answers              Json?    @default("{}")
  expiresAt            DateTime?
  ...
}
```
**The JSONB Rationale (Crucial):** 
In a traditional setup, every answer given by a cadet would be a row in a `StudentAnswer` table. If 3,000 cadets answer 50 questions, that generates 150,000 rows. If they auto-save every second during a 30-minute exam, this produces millions of insert/update operations and causes catastrophic N+1 joining issues when retrieving the exam state.

By storing `answers` as a `JSONB` object (e.g., `{"12": "Option A", "14": "Option C"}`), the 1-second debounced sync merely updates a single column on a single row. This reduces database write load by orders of magnitude and allows instantaneous state rehydration.

### 4.2.4 Telemetry & Audit Layer (`ExamViolation`, `AuditLog`)
```prisma
model AuditLog {
  id         Int      @id @default(autoincrement())
  action     String
  entityType String?
  entityId   String?
  metadata   Json?
  ...
  @@index([action, createdAt])
}
```
**Architectural Decision:** The `AuditLog` is immutable. There are no API endpoints to modify or delete these logs. This table is used to forensically recreate instructor actions (e.g., if a Cadet complains their exam time was maliciously shortened, the `AuditLog` proves exactly who executed the `EXAM_UPDATE_META` action and when).
