# Frontend Features & Screens

Below is the architectural mapping of the React frontend. It breaks down the core screens, their dependencies, state management, and highlights "Web-Only" APIs that must be rewritten for React Native.

---
### Screen: CadetDashboard
**File:** frontend/src/cadet/pages/Dashboard.jsx
**Route:** /cadet/dashboard
**Accessible to roles:** Cadet
**Purpose:** Displays available, in-progress, and completed exams for a cadet along with performance stats.

**Data Dependencies:**
  On mount:
    - calls GET `/api/exams/assigned` → used for: list of exams available to the user
    - calls GET `/api/results` → used for: historical performance data
    - calls GET `/api/leaderboard/me` → used for: active rank
  On user action (auto-recovery):
    - calls POST `/api/attempt/sync` with body { examId, answers } → used for: recovering unsynced answers from localStorage

**State:**
  Local state: 
    - `exams`, `results`, `rankData`: store API responses
    - `loadingExams`, `loadingResults`: loading flags
    - `searchTerm`: tracks search bar input
  Global state: 
    - `user` from `useAuth()` hook
  Derived state: 
    - `filteredExams` (computed from `exams` and `searchTerm`)
    - `calculatePerformance()` (computed average score)
    - `pendingCount` (computed)

**UI Components Used:**
  - `PageLoader` (loading state)
  - `CountdownTimer` (stateful component ticking down `expiresAt`)
  - Icons (`lucide-react`)

**Forms:**
  - Search Input: (not a traditional form, just a controlled text input)

**Web-Only Elements (migration flags):**
  - `localStorage`: Heavily relied upon for offline answer caching (`ncc_exam_..._answers`). Needs `AsyncStorage` or `SecureStore`.
  - CSS classes: Responsive classes like `sm:flex-row`, `lg:grid-cols-2`. Mobile app will require flexbox rewriting.

---
### Screen: ExamAttempt
**File:** frontend/src/cadet/pages/ExamAttempt.jsx
**Route:** /exam/:id
**Accessible to roles:** Cadet
**Purpose:** Highly secure, proctored interface where cadets execute an exam under time constraints.

**Data Dependencies:**
  On mount:
    - calls POST `/api/attempt/start` with body { examId, sessionId } → used for: obtaining exam structure and session token
  On user action (Heartbeat interval - 30s):
    - calls POST `/api/attempt/heartbeat` with body { examId, activeQuestionIndex }
  On user action (Submit):
    - calls POST `/api/attempt/submit` with body { examId, answers: array }

**State:**
  Local state:
    - `exam`, `answers`, `loading`, `timeLeft`, `currentQ`, `isSubmitting`
    - `isSessionExpired`, `recoveryRegNo`, `recoveryPassword` (re-auth overlay)
    - `showConfirmModal`, `showQuestionGridModal` (UI toggles)
  Global state:
    - `user` from `useAuth()`
  Derived state:
    - `isTerminated`, `warningCount`, `isFullscreen`, `isScreenSharing` via custom `useProctoring()` hook.

**UI Components Used:**
  - `GlobalLoader`, `ErrorBoundary`
  - `CountdownTimer`
  - Custom proctoring overlays (Session Expired, Screen Share Required, Secure Mode Required)

**Forms:**
  For each form on this screen:
    - Recovery Login Form:
      - Fields: `recoveryRegNo` (text), `recoveryPassword` (password)
      - Submit target: POST `/api/auth/login`
      - Success behaviour: Closes modal, re-establishes tokens, re-requests fullscreen/screenshare.
      - Error behaviour: `toast.error`
    - Question Types: Radio groups (MCQ), text inputs (FILL_IN_THE_BLANK), textareas (SUBJECTIVE).

**Web-Only Elements (migration flags):**
  - `window.addEventListener('beforeunload')`: Used to trap the user. In RN, use `BackHandler` or React Navigation's `beforeRemove` event.
  - `window.history.pushState` / `popstate`: Used for back-button traps. Will not work in RN.
  - `localStorage`: Used to stash answers incrementally via `useExamAutoSave`. Needs `AsyncStorage`.
  - `document.body.classList`: Unusable in RN.
  - Screen Sharing API (`useProctoring`): Standard web WebRTC `navigator.mediaDevices.getDisplayMedia` is fundamentally different or unsupported natively on mobile without severe compromises.
  - Fullscreen API (`document.documentElement.requestFullscreen`): RN doesn't use this. App-level UI handles immersive mode.

---
### Screen: Login (Student)
**File:** frontend/src/cadet/pages/Login.jsx
**Route:** /login
**Accessible to roles:** Public
**Purpose:** Authenticates cadets via Regimental Number and Password.

**Data Dependencies:**
  On user action (Login):
    - calls POST `/api/auth/login` with body { regimentalNumber, password }

**State:**
  Local state:
    - `regNo`, `password`, `loading`
  Global state:
    - Updates `user` via `saveUser()` and sets tokens in `setToken()`.

**UI Components Used:**
  - Basic Inputs

**Forms:**
  - Login Form:
    - Fields: `regNo` (text), `password` (password, required)
    - Submit target: POST `/api/auth/login`
    - Success behaviour: Redirect to `/cadet/dashboard`
    - Error behaviour: Error toast

**Web-Only Elements (migration flags):**
  - Implicit token storage to cookies or fallback mechanisms. Requires `expo-secure-store`.

---
### Screen: AdminLayout (and Nav Context)
**File:** frontend/src/admin/AdminLayout.jsx & frontend/src/contexts/NavigationContext.jsx
**Accessible to roles:** Admin | Officer
**Purpose:** Wraps admin pages, handles navigation stacks, and enforces styling.

**Web-Only Elements (migration flags):**
  - `document.body.classList.add(...)`: Direct DOM manipulation.
  - `sessionStorage`: `NavigationContext` caches the `nav_stack` here. Requires `AsyncStorage` or simply letting React Navigation manage the stack natively.
  - `window.history.state`: Deep integration with browser history. Needs complete rewrite using React Navigation.

---

### Screen Inventory Table

| Screen | Route | Role(s) | API calls (count) | Web-only flags |
|--------|-------|---------|-------------------|----------------|
| CadetLogin | `/login` | Public | 1 | None |
| AdminLogin | `/admin/login` | Public | 1 | None |
| CadetDashboard | `/cadet/dashboard` | Cadet | 4 | `localStorage`, CSS grids |
| ExamAttempt | `/exam/:id` | Cadet | 4 | `localStorage`, `history`, `beforeunload`, WebRTC Screen Share |
| ExamReview | `/exam/review/:id` | Cadet | 1 | None |
| Results | `/cadet/results` | Cadet | 1 | Charting libraries (DOM) |
| Profile | `/cadet/profile` | Cadet | 1 | `input type="file"` |
| Materials | `/cadet/materials` | Cadet | 1 | `window.open`, `a href` |
| AdminDashboard| `/admin/dashboard`| Admin/Officer | 3 | None |
| ExamCreate | `/admin/exams/new` | Admin/Officer | 2 | `input type="file"`, Excel parse |
| UserManagement| `/admin/users` | Admin/Officer | 4 | CSV Upload |
| MonitorWall | `/admin/monitor` | Admin | 1 (SSE) | WebSocket/SSE, DOM manip |

---

### Navigation Flow Diagram

```mermaid
flowchart TD
    %% Public Flow
    Start([Launch App]) --> AuthCheck{Has Valid Token?}
    AuthCheck -- No --> LoginRouter{Role Selection}
    LoginRouter -- Cadet --> CadetLogin[/login]
    LoginRouter -- Staff --> AdminLogin[/admin/login]

    %% Cadet Flow
    AuthCheck -- Yes (Cadet) --> CadetDash[/cadet/dashboard]
    CadetLogin --> CadetDash
    
    CadetDash -->|Select Exam| ExamLock{Is Active?}
    ExamLock -- Yes --> ExamAttempt[/exam/:id]
    ExamLock -- No/Finished --> ExamReview[/exam/review/:id]
    
    ExamAttempt -->|Auto-Submit/Submit| ExamReview
    ExamReview --> CadetDash
    
    CadetDash --> Results[/cadet/results]
    CadetDash --> Profile[/cadet/profile]
    CadetDash --> Materials[/cadet/materials]
    
    %% Staff Flow
    AuthCheck -- Yes (Admin/Inst) --> AdminDash[/admin/dashboard]
    AdminLogin --> AdminDash
    
    AdminDash --> ExamMgmt[/admin/exams]
    ExamMgmt --> CreateExam[/admin/exams/new]
    ExamMgmt --> Monitor[/admin/monitor]
    
    AdminDash --> UserMgmt[/admin/users]
    AdminDash --> Reports[/admin/reports]
```
