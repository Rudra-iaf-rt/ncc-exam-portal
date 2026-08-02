# Chapter 3: Infrastructure & Deployment

The NCC Exam Portal operates on a containerized architecture utilizing Docker. This ensures absolute parity between local development, staging, and production environments, eliminating "it works on my machine" anomalies.

## 3.1 Container Topology (`docker-compose.yml`)

The system is split into four primary micro-services defined in the orchestration manifest.

### 3.1.1 Database Service (`db`)
- **Image:** `postgres:15-alpine`
- **Volume Persistence:** Uses a named Docker volume `postgres_data` mapped to `/var/lib/postgresql/data`. This guarantees that if the container crashes or is rebuilt, the examination data survives.
- **Restart Policy:** `always` ensures the DB attempts to recover automatically after host reboots.
- **Port Binding:** Exposes 5432 strictly to the internal Docker network. External exposure should be firewalled in production.

### 3.1.2 Caching & Queue Service (`redis`)
- **Image:** `redis:7-alpine`
- **Purpose:** Manages distributed rate-limiting counters and active exam heartbeat timestamps. It provides sub-millisecond response times to prevent gateway bottlenecks.

### 3.1.3 API Backend Service (`backend`)
- **Runtime:** Node.js (v18+)
- **Environment Targeting:** Inherits `NODE_ENV=production` forcing Express into optimized routing modes and suppressing verbose stack traces in error payloads.
- **Internal Routing:** Connects to PostgreSQL via `postgresql://${DB_USER}:${DB_PASSWORD}@db:5432` rather than `localhost`, utilizing Docker's internal DNS resolution.

### 3.1.4 Frontend Service (`frontend`)
- **Runtime:** Nginx/Vite preview (depending on deployment target).
- **Environment Variables:** `VITE_API_URL` is mapped to the backend service. In a true production deployment (e.g., AWS CloudFront or Vercel), this container is replaced by static CDN edge distribution.

## 3.2 Dynamic Runtime Configuration (Feature Flags)

The backend utilizes strict environment variable typing. Crucially, the system implements runtime feature flags to allow administrators to alter critical logic without re-deploying code.

- `FEATURE_COOKIE_AUTH`: Boolean. When `true`, enforces strict HTTP-Only cookie adherence for JWT transmission, drastically reducing XSS attack surfaces compared to `localStorage`.
- `FEATURE_STRICT_EXAM_SESSION`: Boolean. When `true`, prevents a cadet from resuming an exam if their `sessionId` (generated at start) changes, blocking multiple device logins.
- `FEATURE_TIMEOUT_AUTO_CLOSE`: Boolean. When `true`, activates the server-side chron-job that sweeps the database for expired attempts and forcibly transitions them to `SUBMITTED`, generating the final score.
- `FEATURE_SOFT_DELETE_USERS`: Boolean. Prevents cascading `DELETE` statements on the `User` table, instead toggling an `isActive` flag. This preserves the immutable `AuditLog` integrity for historical compliance.

## 3.3 Scaling Limits & Constraints

### 3.3.1 Database Connection Saturation
PostgreSQL forks a dedicated OS process per connection, utilizing roughly 10MB of RAM each. At 9,000 concurrent users, direct naive querying from Node.js instances would instantly crash the database with "too many clients" errors.
- **Mitigation Strategy:** Node.js instances are configured to pool a maximum of 10-15 connections. In high-scale deployments, a lightweight connection pooler like **PgBouncer** is placed between the Node instances and PostgreSQL to multiplex thousands of virtual connections down to a safe physical threshold.

### 3.3.2 Memory Limits (Redis)
Redis is primarily used for ephemeral data (rate limiting, heartbeats). The eviction policy must be set to `volatile-lru` or `allkeys-lru` so that if memory spikes, the system automatically drops old rate-limit counters rather than crashing with OOM (Out of Memory) errors.
