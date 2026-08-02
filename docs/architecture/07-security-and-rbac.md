# Chapter 7: Security, RBAC & Token Mechanisms

The NCC Exam Portal operates on a Zero-Trust architecture. We assume the client browser is a hostile environment, capable of clock manipulation, local storage tampering, and script injection.

## 7.1 Authentication Architecture (JWT)

### 7.1.1 The Dual-Token Pattern
To balance usability (not forcing cadets to login every 15 minutes) with security (allowing administrators to instantly kill compromised sessions), the system uses a dual-token approach.

1. **Access Token (Short-lived):** A JWT valid for ~15 minutes. It contains the user's `id`, `role`, and `collegeCode`. This is used for all API requests.
2. **Refresh Token (Long-lived):** An opaque string (or long-lived JWT) stored in the `RefreshToken` database table. Valid for ~7 days.

### 7.1.2 The Refresh Flow
When the frontend detects a `401 Unauthorized` response (Access Token expired), the `Axios` interceptor transparently halts the request, hits `POST /api/auth/refresh` using the Refresh Token, retrieves a new Access Token, and replays the original failed request. The cadet experiences zero interruption.

### 7.1.3 Revocation Capabilities
Because Access Tokens are stateless, they cannot be invalidated until they expire. However, if an Admin detects malicious activity, they can revoke the `RefreshToken` in the database. Within 15 minutes, the Access Token will die, the Refresh attempt will be rejected by the database, and the attacker will be forcefully logged out.

## 7.2 Transmission Security (HTTP-Only Cookies)

By default, the application is configured to utilize `HTTP-Only` cookies for token transmission via the `FEATURE_COOKIE_AUTH` flag.
- **Why?** If tokens are stored in `localStorage`, any malicious JavaScript injected into the page (Cross-Site Scripting / XSS) can easily read them and steal the session.
- **The Cookie Guard:** An `HTTP-Only` cookie cannot be read by JavaScript `document.cookie`. It is automatically attached by the browser to every outgoing request to the backend domain, rendering XSS token theft impossible.

## 7.3 Mitigation of Common Attack Vectors

### 7.3.1 Cross-Site Request Forgery (CSRF)
If utilizing cookies, CSRF becomes a vector. The API requires strict `CORS` origins and validates the `Origin` and `Referer` headers to ensure requests originate exclusively from the legitimate NCC portal domain.

### 7.3.2 Cross-Site Scripting (XSS)
React automatically sanitizes all string outputs, rendering basic DOM-based XSS highly difficult. Additionally, the backend implements `Helmet` to attach a `Content-Security-Policy (CSP)` header, preventing the browser from loading external, unauthorized scripts.

### 7.3.3 Injection Attacks
- **SQL Injection:** Impossible, as Prisma ORM compiles all queries using parameterized statements. Raw string concatenation in queries is strictly prohibited by the engineering constitution.
- **NoSQL / JSON Injection:** The `answers` JSONB column is validated by `Zod` prior to storage. If a cadet attempts to send a 50MB malicious JSON payload, the Zod schema size limits and the express body-parser limits will reject it with a `413 Payload Too Large`.

## 7.4 Endpoint Authorization Guarantees
Middleware alone is insufficient. A Cadet proving they are a Cadet via a token does not grant them access to *all* Cadet data.
- **Layer 2 Checks:** In endpoints like `/api/exams/:id/result`, the controller explicitly checks that `attempt.studentId === req.user.id`. Without this, an IDOR (Insecure Direct Object Reference) vulnerability would allow Cadets to iterate through IDs and view other Cadets' scores.
