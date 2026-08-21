# Feature to API Matrix

This document maps frontend actions directly to their backend API dependencies across the core business domains, linking the UI surface (`04_frontend_features.md`) to the backend surface (`03_api_surface.md`).

## 1. Authentication Domain
| Feature | Screen | User Action | API Call | Payload | Response Used For |
|---------|--------|-------------|----------|---------|-------------------|
| Cadet Login | `CadetLogin` | Submit Form | `POST /api/auth/login` | `{ regimentalNumber, password }` | Stores JWT tokens in `localStorage`, sets `user` state, redirects to `/cadet/dashboard`. |
| Staff Login | `AdminLogin` | Submit Form | `POST /api/auth/login/staff` | `{ email, password }` | Stores tokens, sets `user` state, redirects to `/admin/dashboard`. |
| Recover Session | `ExamAttempt` | Re-auth Modal | `POST /api/auth/login` | `{ regimentalNumber, password }` | Restores token without losing exam state or terminating the session. |
| Logout | Any | Click Logout | `POST /api/auth/logout` | None | Revokes refresh token, clears `localStorage`, fires `window.ncc_logout` event. |
| Auto-Refresh | `api.js` (Global) | 401 Interceptor | `POST /api/auth/refresh` | `{ refreshToken }` | Silently renews expired access tokens during API calls. |

## 2. Exam Execution Domain
| Feature | Screen | User Action | API Call | Payload | Response Used For |
|---------|--------|-------------|----------|---------|-------------------|
| Load Dashboard | `CadetDashboard` | Mount | `GET /api/exams/assigned` | None | Lists exams available for the cadet to take. |
| Start Exam | `CadetDashboard` | Click 'Start' | `POST /api/attempt/start` | `{ examId, sessionId }` | Marks attempt as `IN_PROGRESS`, returns exam JSON and remaining time. |
| Heartbeat | `ExamAttempt` | 30s Interval | `POST /api/attempt/heartbeat` | `{ examId, activeQuestionIndex }`| Syncs server time, prevents timeout, tracks active question. |
| Save Answer | `ExamAttempt` | Select Option | (Local Cache) | `{ questionId, option }` | Synchronously saves to `localStorage` (crash-proof). |
| Sync Answers | `ExamAttempt` | Background Job | `POST /api/attempt/sync` | `{ examId, answers }` | Flushes local answers to server DB. |
| Submit Exam | `ExamAttempt` | Click 'Submit' / Auto-Submit | `POST /api/attempt/submit` | `{ examId, answers }` | Finalizes exam, grades answers, redirects to review. |

## 3. Results & Leaderboard Domain
| Feature | Screen | User Action | API Call | Payload | Response Used For |
|---------|--------|-------------|----------|---------|-------------------|
| Load Results | `CadetDashboard` | Mount | `GET /api/results` | None | Renders historical performance and calculates average score. |
| Load Rank | `CadetDashboard` | Mount | `GET /api/leaderboard/me` | None | Shows cadet's relative rank within the NCC unit. |
| Review Attempt | `ExamReview` | Mount | `GET /api/exams/:id` | None | Retrieves questions and correct answers for post-exam review. |

## 4. Admin Management Domain
| Feature | Screen | User Action | API Call | Payload | Response Used For |
|---------|--------|-------------|----------|---------|-------------------|
| Manage Exams | `ExamList` | Mount | `GET /api/admin/exams` | Pagination/Filters | Displays all drafted and published exams. |
| Create Exam | `ExamCreate` | Submit Form | `POST /api/exams/create` | `{ title, duration, questions }`| Creates a new exam blueprint. |
| Import Users | `UserManagement` | Upload CSV | `POST /api/admin/users/import` | `FormData` (CSV) | Bulk registers cadets. |
| Live Monitor | `MonitorWall` | Mount | `GET /api/admin/exams/:id/live-monitor` | None | SSE connection for real-time cadet proctoring alerts. |

---

## SHARED LOGIC

The following frontend hooks and utilities govern core application logic. They are classified based on their portability to React Native.

### 🟢 Portable (Zero or Minimal Changes)
These files do not rely on browser-specific APIs and can be migrated directly:
- **`resourceCache.js`**: Implements in-memory caching (`Map`) for API responses (e.g., dashboard data, `auth:me`). Fully portable.
- **`randomization.js` (`seededShuffle`)**: Pure JS function used to deterministically shuffle exam questions and options based on the cadet's user ID.
- **`api.js` (Axios Interceptors)**: The logic for catching 401s, queuing requests, and calling `/api/auth/refresh` is pure JS. *(Note: the storage mechanism inside it is RED).*
- **`useTimedFetch` / `useCachedFetch`**: Pure React hooks for polling and cache invalidation.

### 🔴 Platform-Specific (Needs React Native Rewrite)
These files heavily rely on DOM or Web APIs and MUST be rewritten:
- **`auth.js` / `api.js` (Storage)**: Relies on `localStorage.getItem` and `localStorage.setItem` for JWT tokens. 
  - **Fix:** Replace with Expo `SecureStore` (for tokens) and `@react-native-async-storage/async-storage` (for user state).
- **`useAuth` (Event Bus)**: Uses `window.addEventListener('ncc_logout')` for cross-tab logout synchronization.
  - **Fix:** Replace with React Context, Zustand, or `DeviceEventEmitter`.
- **`useExamAutoSave`**: The backbone of the exam engine. Uses `localStorage` synchronously on every click to prevent data loss. Hooks into `document.addEventListener('visibilitychange')` to force syncs when the user minimizes the browser.
  - **Fix:** Must use `AsyncStorage` (asynchronous, requires state refactor) and `AppState` API in React Native for backgrounding detection.
- **`useProctoring`**: Deeply coupled to Web APIs:
  - `navigator.mediaDevices.getDisplayMedia` (WebRTC Screen Sharing)
  - `document.documentElement.requestFullscreen`
  - `document.hasFocus()`, `window.addEventListener('blur')`, `document.addEventListener('mouseleave')`
  - **Fix:** React Native handles immersive mode differently. For true proctoring, native device-management modules (MDM) or specialized background services (like Kiosk Mode on Android / Guided Access on iOS) are required. Standard RN apps cannot easily track "blur" or force screen recording without OS-level permissions.
