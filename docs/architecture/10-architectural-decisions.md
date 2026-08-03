# Chapter 10: Architectural Decision Records (ADRs)

An Architectural Decision Record (ADR) captures a critical engineering decision, the context surrounding it, and the trade-offs accepted. This prevents future developers from blindly tearing down structures they don't fully understand ("Chesterton's Fence").

## ADR 001: JSONB for Exam State over Relational Tables

### Context
During an exam, 3,000 cadets must save their answers continuously to prevent data loss. A traditional relational model would dictate an `Answer` table (e.g., `id`, `attemptId`, `questionId`, `selectedOption`). 

### The Problem
If 3,000 cadets auto-save every 1 second, the system must process 3,000 SQL operations per second. If we use a relational table, an `UPSERT` (Check if answer exists, update if true, insert if false) is required for every single question click. This generates immense transaction overhead and index recalculation on the database. Furthermore, retrieving the exam state requires joining the `Attempt`, `Question`, and `Answer` tables, leading to catastrophic N+1 querying.

### Decision
Store all answers for an attempt as a single JSON object in a `JSONB` column on the `Attempt` table (`answers: {"12": "A", "14": "C"}`).

### Trade-offs Accepted
- **Pros:** A cadet's entire state update is a single, lightning-fast `UPDATE Attempt SET answers = $1` operation. Retrieving the state requires zero joins. Massive reduction in Postgres CPU load.
- **Cons:** It is difficult to run analytical SQL queries like "How many cadets chose Option A for Question 14?" natively in SQL.
- **Mitigation:** Analytics are performed by pulling the JSON arrays into the Node.js memory layer post-exam and calculating averages via Javascript arrays, shifting the analytical load from the DB to the scalable API layer.

---

## ADR 002: Heuristic Proctoring over WebRTC Video

### Context
To maintain assessment integrity, the system needs to prevent cheating. Standard industry solutions use WebRTC to stream a cadet's webcam and microphone to a proctor.

### The Problem
The NCC operates extensively in rural sectors of India where mobile 3G/4G bandwidth is inconsistent. WebRTC requires sustained high bandwidth. Furthermore, storing thousands of hours of video requires massive AWS S3 expenditure.

### Decision
Abandon video streaming entirely. Rely exclusively on browser heuristics: `visibilitychange` (Tab Switching) and `blur` (Focus Loss).

### Trade-offs Accepted
- **Pros:** Practically zero bandwidth overhead. Highly scalable (can monitor 10,000 cadets with minimal CPU overhead). Cost-effective.
- **Cons:** Cannot prevent a cadet from looking at a physical textbook or using a secondary device (like a smartphone off-camera). Subject to false positives from OS notifications.
- **Mitigation:** The system accepts that it cannot solve 100% of physical cheating. It solves 95% of digital cheating. False positives are mitigated by setting a warning threshold (e.g., 3 strikes) before termination.

---

## ADR 003: JWT Authentication over Stateful Sessions

### Context
We need to track logged-in users. Traditional Node.js apps use `express-session` with sticky sessions or Redis stores to track session IDs.

### The Problem
Sticky sessions prevent seamless horizontal scaling (a user must always hit the same server). While Redis solves this, requiring a Redis lookup for *every single HTTP request* adds network latency and a single point of failure.

### Decision
Utilize stateless JSON Web Tokens (JWT) for Access Tokens, transmitted via HTTP-Only cookies.

### Trade-offs Accepted
- **Pros:** Instant validation on the API server requiring zero database or Redis lookups. Seamless horizontal scaling—any API node can service any request.
- **Cons:** A stateless JWT cannot be forcefully revoked until it expires natively.
- **Mitigation:** Access tokens are kept extremely short-lived (15 minutes). Long-lived Refresh tokens are stored in the database. If an account is banned, the Access token will die within 15 minutes, and the Refresh token will be rejected.
