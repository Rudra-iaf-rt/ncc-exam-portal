# NCC Portal – Implementation Roadmap & Architecture

This document outlines the high-level portal architecture and the specific remaining features required to complete the **Admin Portal** according to the PRD and Style Guide.

## High-Level Portal Architecture

Based on the PRD and Style Guide, the system consists of three primary portals:

### 1. Cadet Portal
*   **Role:** Students/Cadets.
*   **Key Features:** Exam Hall (MCQ with timer), Results view, Study materials (PDF/Video).
*   **Terminology:** "Cadet", "Examination", "Regimental number".

### 2. Officer Portal (ANO / College Admin)
*   **Role:** Associate NCC Officers (Staff).
*   **Key Features:** Exam management, Question uploads, College-level result analytics.
*   **Terminology:** "ANO", "Officer", "College".

### 3. Admin Portal (Unit HQ)
*   **Role:** Unit HQ Administrators.
*   **Key Features:** Full user registry management, Unit-wide analytics, Result overrides, Export reports.
*   **Terminology:** "Admin", "Unit", "Command Centre".

---

## Admin Portal (Unit HQ) – Implementation Checklist

*   [x] **Cadet Terminology Sync:** Updated all instances of "Student" to **Cadet**.
*   [x] **Style Guide Stat Cards:** Dashboard cards now reflect core Unit-wide metrics.
*   [ ] **Real-time Activity:** (Pending) Periodic refresh for "Recent Results".

## 2. User & Registry Management
*   [x] **Advanced Role Management:** `EditUserModal` allows changing between CADET, OFFICER, and ADMIN.
*   [x] **Account Status Control:** Implemented `isActive` toggle (Enable/Disable).
*   [x] **Wing/Corps Identification:** Classify cadets by Army, Navy, or Air wings.
*   [ ] **Bulk Operations:** Multi-select actions for registry management.
*   [ ] **College Directory:** Switch to managed list of institutions.

## 3. Examination Lifecycle
*   [x] **Eligibility & Assignment:** Managed authorization via `Assignments.jsx`.
*   [x] **Publishing Workflow:** Draft/Live/Archived status controls in `ExamList`.
*   [ ] **Question Bank Editor:** Centralized unit-wide exam creation suite.
*   [ ] **Materials Management:** Oversight of study materials.

## 4. Reporting & Results
*   [x] **CSV Export:** Client-side export implemented in Results Board.
*   [x] **Result Override:** Admin override with mandatory auditing implemented.
*   [x] **Advanced Filters:** Filter by Wing, College, Batch, and Status.

## 5. Security & Auditing
*   [x] **Audit Log Viewer:** Visual trace of system events in `AuditLogs.jsx`.
*   [ ] **Active Session Monitoring:** Monitor and terminate user sessions.

## 6. UI/UX Consistency (Style Guide Adherence)
*   [x] **Typography:** DM Mono and Outfit typography enforced.
*   [x] **Button Variants:** Styled buttons per command center palette.
*   [x] **Empty States:** Clear directives in empty table views.

---

*Last Updated: 24 April 2026*
