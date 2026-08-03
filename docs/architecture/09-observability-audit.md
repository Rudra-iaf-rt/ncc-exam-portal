# Chapter 9: Observability, Audit & Incident Response

In an enterprise examination system, logging is not just for debugging—it is a legal and compliance requirement. The system must be able to forensically prove the sequence of events if an exam's integrity is questioned.

## 9.1 Request Tracing (`UUID v4`)

Every incoming HTTP request generates a unique `x-request-id` at the outermost Express middleware layer (often provided by a Load Balancer or generated via `uuidv4()`).
- **Propagation:** This ID is attached to the `req` object.
- **Logging:** The Winston logger automatically appends this `requestId` to every single log line emitted during the request lifecycle.
- **Benefit:** When an instructor reports "Cadet X got an error at 14:02", an engineer can grep the logs for the exact `requestId` and see the complete sequence (Auth -> Validation -> DB Query -> Crash) in total isolation from the 3,000 other concurrent users.

## 9.2 Structured JSON Logging (Winston)

`console.log` is strictly prohibited in production. All logs utilize `Winston` outputting purely structured JSON.

```json
{
  "timestamp": "2026-08-02T14:02:00Z",
  "level": "error",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": 1042,
  "action": "EXAM_SAVE",
  "message": "Database connection timeout during saveAnswer",
  "code": "DB_001"
}
```
**Aggregation:** In deployment, these JSON logs are ingested by tools like Datadog, ELK, or Axiom, allowing engineers to create alerts (e.g., "Trigger PagerDuty if `DB_001` occurs > 50 times in 1 minute").

## 9.3 The Immutable Audit Ledger (`AuditLog`)

While Winston handles application logs, business-critical actions require permanent retention in PostgreSQL.

### 9.3.1 Critical Events Logged
- `EXAM_CREATE` / `EXAM_PUBLISH`
- `ATTEMPT_SUBMIT`
- `MANUAL_SCORE_OVERRIDE` (Requires justification metadata)
- `USER_ROLE_ELEVATION`

### 9.3.2 Audit Constraints
The `AuditLog` table is insert-only. There are no API endpoints to `DELETE` or `UPDATE` an audit log. A cron job may archive logs older than 5 years to cold storage, but they are never erased.

## 9.4 Health Checks & Incident Response

### 9.4.1 The `/health` Endpoint
The API exposes an unauthenticated `/health` endpoint utilized by the Load Balancer to determine container viability.
- It returns `{ status: 'ok', db: 'ok', redis: 'ok' }`.
- If PostgreSQL is unreachable, it returns HTTP `503 Service Unavailable`. The Load Balancer will automatically route traffic away from the failing container or trigger a restart.

### 9.4.2 Incident Classification & Graceful Degradation
According to `AGENTS.md`, incidents are classified aggressively. 
- **P0 (Production Down / Data Corruption):** 15-minute response SLA. Requires an immediate rollback of the latest deployment.
- **Graceful Degradation:** If the Redis cache fails, the system must be engineered to bypass rate-limiting and default to "Allow All" rather than crashing the exam for 3,000 users. Security yields to availability during catastrophic P0 failures.
