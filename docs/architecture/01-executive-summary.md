# Chapter 1: Executive Summary & Scale Targets

## 1.1 Product Vision & Business Context
The **NCC Examination Portal** serves as a secure digital evaluation ecosystem for the National Cadet Corps (NCC). The primary business driver is to eliminate the severe operational inefficiencies and cheating vulnerabilities inherent in manual, paper-based cadet testing. 

By delivering a high-integrity, real-time proctored environment, the portal ensures that testing standards remain rigorous, standardized, and immediately auditable across thousands of participating colleges and distinct wings (Army, Navy, Air Force).

## 1.2 Target Audience & Stakeholders
- **Cadets (End-Users):** Require a highly resilient test-taking sandbox that prevents data loss during intermittent network drops, commonly experienced in rural campus areas.
- **Instructors / ANOs (College Administrators):** Require seamless bulk-import workflows, granulated exam assignment capabilities, and real-time oversight over cadet progress and violations.
- **HQ Administrators (System Owners):** Require global aggregate analytics, audit traceability for manual score overrides, and total control over organizational structuring.

## 1.3 Engineering Constitution & Scale Targets
The platform is bound by strict, non-negotiable Service Level Agreements (SLAs) defined in the Engineering Constitution (`AGENTS.md`):

### Concurrency & Throughput
- **Sustained Users:** 3,000 concurrent active cadets.
- **Spike Load:** Up to 9,000 concurrent users during peak synchronized exam start windows.
- **Connection Strategy:** The database tier strictly caps connections using pooling to avoid thread exhaustion, while the API servers scale horizontally behind a load balancer.

### Performance (Latency)
- **Normal Load API Latency (p95):** `< 300ms` for critical transactional endpoints (e.g., `PATCH /api/exams/saveAnswer`).
- **Spike Load API Latency (p95):** `< 800ms` at maximum concurrency.
- **Time to Interactive (TTI):** `< 3 seconds` on mid-range Android mobile devices on 3G/4G networks.
- **Frontend Bundle Size:** The initial React JS payload must remain under 200KB (gzipped).

### Reliability & Resilience
- **Availability Target:** `99.5%` monthly uptime (less than 3.6 hours of permitted downtime per month).
- **Error Rate Tolerance:** `< 0.5%` HTTP 5xx responses.
- **Graceful Degradation:** The system must never silently drop data. If external dependencies fail (e.g., Google Drive material sync), the core exam engine must continue functioning via circuit breakers. If the database locks under extreme write-load, writes must queue or fail with a clear `Retry-After` header rather than hanging the client.

## 1.4 The "Zero Data Loss" Mandate
The most critical architectural requirement is preventing cadet work loss. The system achieves this by abandoning traditional "submit at the end" paradigms in favor of **Incremental Persistence**. Every action is logged and synced to the backend every 1000ms. If a cadet's device loses power or their browser crashes, their session is rehydrated to the exact second upon re-authentication.
