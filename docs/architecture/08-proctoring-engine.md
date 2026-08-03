# Chapter 8: Anti-Cheat & Proctoring Engine

Traditional proctoring solutions rely on resource-heavy WebRTC video streaming. Given the target demographic of the NCC (often operating in rural bandwidth-constrained environments), video streaming is unscalable. 

The NCC Exam Portal instead relies on a highly optimized, low-bandwidth **Heuristic Telemetry Engine**.

## 8.1 Heuristic Telemetry Vectors

The frontend React application initializes invisible guards immediately upon mounting the `<ExamAttempt />` component.

### 8.1.1 The Tab Switch Vector (`visibilitychange`)
Cadets often attempt to Google answers by opening a new tab.
- **Mechanism:** The system binds an event listener to `document.addEventListener("visibilitychange")`.
- **Detection:** If `document.hidden` becomes `true`, the browser has been minimized or a new tab has been focused. The system instantly covers the exam UI with a full-screen "Security Breach" warning and fires a telemetry payload to the backend.

### 8.1.2 The Application Blur Vector (`blur`)
Cadets might attempt to open a smaller window (e.g., Notepad or a Chat app) over the browser without technically minimizing the browser tab.
- **Mechanism:** The system binds to `window.addEventListener("blur")`.
- **Detection:** Any loss of window focus triggers the security breach overlay and fires telemetry.

## 8.2 Telemetry Ingestion API (`POST /api/anti-cheat/violation`)

When the frontend detects a breach, it fires an immediate, non-debounced POST request to the backend.

1. **Rate Limiting:** Due to potential event spam (e.g., rapidly clicking inside and outside a window), this specific endpoint has a higher rate limit bucket (100 req/min) to prevent the cadet from being locked out due to `429 Too Many Requests`.
2. **Database Mutation:** 
   - A new `ExamViolation` record is created linking the `studentId`, `examId`, and the exact timestamp.
   - The `Attempt` record's `warningCount` is incremented atomically.
3. **The Guillotine Rule (Threshold Submission):**
   - After incrementing, the backend checks: `if (attempt.warningCount >= MAX_WARNINGS)`. 
   - If true, the backend synchronously finalizes the exam, sets the status to `SUBMITTED`, and revokes access. The API responds with a `TERMINATED` flag, instructing the frontend to kick the user to the results screen.

## 8.3 Real-Time Monitor Wall (Heartbeats)

Instructors need to know if Cadets are actively taking the exam or if they have mysteriously vanished (e.g., power cut or malicious disconnection to pause the timer).

### 8.3.1 The Heartbeat Loop
- The frontend runs a lightweight `setInterval` (e.g., every 15 seconds) triggering `POST /api/anti-cheat/heartbeat`.
- **Cache Optimization:** Instead of hammering PostgreSQL with `UPDATE ExamHeartbeat` every 15 seconds for 3,000 cadets (generating 12,000 writes per minute), the backend stores heartbeats in **Redis** with a TTL (Time-To-Live) of 45 seconds.
- **Monitor Wall UI:** The Admin dashboard queries the Redis keyspace (or a debounced PostgreSQL view) to render a live grid of green (active) and red (disconnected) dots representing the cadets. 

## 8.4 Known Weaknesses & False Positives
Heuristics are not flawless. A system OS notification (e.g., a Windows Update pop-up) can steal focus and trigger a false-positive `blur` event.
- **Mitigation:** The `MAX_WARNINGS` threshold is deliberately set to `3` to absorb accidental OS interruptions. Instructors are trained via the Admin Console to review the `ExamViolation` logs and can manually execute a `POST /api/exams/resetAttempt` override if they determine the violations were false positives.
