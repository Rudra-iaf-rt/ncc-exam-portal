# Phase 1: Codebase Discovery

## 1. Tech Stack Inventory
- **Framework:** React 19 with Vite
- **Router:** `react-router-dom` (v7)
- **State Management:** React Context (found `NavigationContext`, `AdminAuthContext`, `ConfirmContext`). No Redux or Zustand detected.
- **Data Fetching:** Axios, with custom hooks for caching/timing (`useCachedFetch`, `useTimedFetch`).
- **Form Library:** Uncontrolled inputs / basic React state (No react-hook-form or formik found in package.json).
- **CSS Approach:** Tailwind CSS v4, `clsx`, `tailwind-merge`. Custom theming via CSS variables in `index.css`.
- **Animation Library:** `framer-motion`.
- **Icon Set:** `lucide-react`.
- **Feedback/Toasts:** `sonner`.
- **Auth Mechanism:** Token-based authentication using React Context guards (`RequireCadet`, `RequireStaff`, `RequireAdmin`).

## 2. Route/Page Map

### Public / Landing
- `/` - `CadetLogin`
- `/forgot-password` - `ForgotPassword`
- `/reset-password` - `ResetPassword`

### Cadet Portal (Guarded by RequireCadet)
- `/cadet/dashboard` - `CadetDashboard`
- `/cadet/results` - `CadetResults`
- `/cadet/materials` - `CadetMaterials`
- `/cadet/profile` - `CadetProfile`
- `/cadet/settings/password` - `ChangePassword`
- `/exam/:id` - `ExamAttempt`
- `/exam/review/:examId` - `ExamReview`

### Admin Portal (Guarded by RequireStaff & RequireAdmin)
- `/admin/login` - `AdminLogin`
- `/admin/dashboard` - `Dashboard`
- `/admin/exams` - `ExamList`
- `/admin/results` - `ResultsBoard`
- `/admin/results/review/:examId/:studentId` - `AdminExamReview`
- `/admin/users` - `UserManagement`
- `/admin/groups` - `CandidateGroups`
- `/admin/settings/password` - `ChangePassword`
- `/admin/exams/create` - `ExamCreate`
- `/admin/exams/edit/:id` - `ExamEdit`
- `/admin/exams/schedule` - `ScheduleExam`
- `/admin/exams/:id/monitor` - `MonitorWall`
- `/admin/exams/:id/analytics` - `ExamAnalytics`
- `/admin/assignments` - `Assignments`
- `/admin/materials` - `MaterialManagement`
- `/admin/staff` - `StaffManagement`
- `/admin/colleges` - `CollegeManagement`
- `/admin/logs` - `AuditLogs`
- `/admin/performance` - `PerformanceDashboard`

## 3. Component Inventory
- **Layout/Navigation:** `CadetLayout`, `AdminLayout`
- **Feedback/Loaders:** `GlobalLoader`, `PageLoader`, `ErrorBoundary`, `DevPerfPanel`
- **Data Display:** `StatCard`
- **Forms/Inputs:** `CustomSelect`, `MultiSelect`, `ui/checkbox`
- *(Additional components likely inline within pages or split in feature folders like `admin/components` or `cadet/components`)*

## 4. State & Data Flow
- **Global State:** Minimal. User session managed in `AdminAuthContext` (and presumably a Cadet equivalent). UI states like confirmation modals managed via `ConfirmContext`.
- **Data Fetching Strategy:** Standard REST over Axios (`api/client.js`). Custom hooks `useCachedFetch` suggest some client-side caching mechanism for read-heavy operations without relying on React Query.

## 5. API/Backend Contract
- **Client Configuration:** Axios instance configured in `api/client.js` handles token injection and interception.
- **Endpoints:** Categorized into files (`admin.js`, `auth.js`, `exam.js`, `materials.js`, `leaderboard.js`).
- **Mobile Reusability:** The existing backend is likely 100% reusable via JWT tokens. `expo-secure-store` will be used instead of web storage for tokens.

## 6. Business Logic
- **Permissions:** Strict route guarding based on user roles (Cadet, Staff, Admin).
- **Exam Engine:** `ExamAttempt` likely contains complex logic for timers, auto-submit, question traversal, and preventing cheating (which on mobile might need app-state listeners to prevent switching away).

## 7. Assets
- **Fonts:** `Noto Sans` (Display/UI), `Noto Sans Mono` (Code/Data).
- **Icons:** `lucide-react` (can be swapped for `lucide-react-native`).
