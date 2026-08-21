# React Native Migration Risk Register

This document identifies architectural and implementation risks when migrating the NCC Exam Portal from a React/Vite web application to a React Native/Expo mobile application.

---
### RISK-001: Token Storage & Authentication Flow
**Severity:** CRITICAL
**Category:** Auth
**Web behaviour:** `auth.js` intercepts tokens and writes them synchronously to `localStorage` (or falls back to cookies if `VITE_COOKIE_AUTH` is enabled). The app relies on synchronous retrieval (`localStorage.getItem('ncc_token')`) to check auth state on render.
**Problem in React Native:** Mobile apps should not use `AsyncStorage` for sensitive JWT tokens. React Native `SecureStore` (Keychain/Keystore) is asynchronous, meaning the synchronous `auth.js` design will block or fail on mobile.
**Recommended solution:** Use `expo-secure-store` for tokens and wrap the root application in an async `AuthProvider` that resolves loading state before rendering the navigation tree.
**Decision required from team:** Yes — Confirm that `expo-secure-store` is acceptable for local token persistence on cadet-owned devices.
**Files affected:** `frontend/src/lib/auth.js`, `frontend/src/lib/api.js`, `frontend/src/App.jsx`

---
### RISK-002: File Uploads & CSV Processing
**Severity:** CRITICAL
**Category:** Platform-API
**Web behaviour:** Admins upload CSV files using `<input type="file">` which is then parsed client-side using `papaparse` before submitting bulk user registrations.
**Problem in React Native:** There is no `<input type="file">` in React Native. Native file systems require intent-based file pickers.
**Recommended solution:** Implement `expo-document-picker` to select the file. For parsing CSV locally on the device, `papaparse` can still work if passed the raw string via Expo FileSystem (`expo-file-system.readAsStringAsync`), though for large batches, it may be more performant to send the raw file via `FormData` and let the backend parse it.
**Decision required from team:** Yes — Should we move CSV parsing to the backend (`multer` + `fast-csv`) instead of maintaining client-side parsing?
**Files affected:** `frontend/src/admin/pages/UserManagement.jsx`, `frontend/src/admin/pages/ExamCreate.jsx` (for Excel uploads)

---
### RISK-003: Server-Side Rendering Dependency
**Severity:** CRITICAL
**Category:** Infrastructure
**Web behaviour:** The current web app is built with Vite as a Single Page Application (SPA) and wrapped with `vite-plugin-pwa` for service-worker caching.
**Problem in React Native:** React Native has no DOM and doesn't run service workers.
**Recommended solution:** Fortunately, the app is purely client-rendered (no Next.js/Remix SSR). The service worker caching logic can be safely discarded, and the API request caching mechanism (`resourceCache.js`) will naturally port over.
**Decision required from team:** No
**Files affected:** `frontend/package.json`, `frontend/src/lib/resourceCache.js`

---
### RISK-004: Browser History & Back-Button Traps
**Severity:** HIGH
**Category:** Navigation
**Web behaviour:** During an exam attempt, the app uses `window.history.pushState` and `window.addEventListener('popstate')` to aggressively trap the user and prevent them from leaving the screen without submitting.
**Problem in React Native:** `window.history` does not exist. React Navigation manages a native stack.
**Recommended solution:** Use React Navigation's `beforeRemove` event listener on the Screen component, and intercept Android hardware back buttons using React Native's `BackHandler.addEventListener`.
**Decision required from team:** No
**Files affected:** `frontend/src/cadet/pages/ExamAttempt.jsx`, `frontend/src/contexts/NavigationContext.jsx`

---
### RISK-005: CSS Flexbox Defaults & Layout Assumptions
**Severity:** HIGH
**Category:** UI
**Web behaviour:** Uses Tailwind CSS extensively (`sm:flex-row`, `grid-cols-2`). The web assumes elements default to `display: block` and `flex-direction: row`.
**Problem in React Native:** React Native uses Yoga flexbox where `flex-direction` defaults to `column`, and everything behaves like `display: flex`. Furthermore, CSS Grid (`grid-cols-2`) is not supported natively.
**Recommended solution:** Refactor grids into `FlatList` with `numColumns={2}` or nested Flexbox rows. Switch to `NativeWind` to keep the Tailwind utility class developer experience, but manually audit every screen's layout.
**Decision required from team:** Yes — Do we adopt `NativeWind` to reuse the existing Tailwind mental model, or rewrite styles using `StyleSheet.create`?
**Files affected:** All `frontend/src/**/*.jsx` files.

---
### RISK-006: Third-Party Web-Only Libraries
**Severity:** HIGH
**Category:** UI
**Web behaviour:** `CadetDashboard` and `ResultsBoard` use `recharts` to render SVG-based analytical charts based on performance data.
**Problem in React Native:** `recharts` is strictly built for the DOM and standard SVG elements. It will instantly crash React Native.
**Recommended solution:** Replace `recharts` with `react-native-chart-kit` or `victory-native`.
**Decision required from team:** Yes — Approve the charting library replacement.
**Files affected:** `frontend/package.json`, `frontend/src/cadet/pages/Results.jsx`, `frontend/src/admin/pages/PerformanceDashboard.jsx`

---
### RISK-007: Proctoring, WebRTC & Background State
**Severity:** HIGH
**Category:** Platform-API
**Web behaviour:** The `useProctoring` hook uses `navigator.mediaDevices.getDisplayMedia` to force screen-sharing, and relies on `document.hasFocus()` and `visibilitychange` to detect cheating. The `useExamAutoSave` writes to `localStorage` synchronously and flushes to the server via heartbeat polling.
**Problem in React Native:** 
1. Mobile browsers don't support `getDisplayMedia` natively within app sandboxes.
2. Backgrounding an app pauses JS execution on iOS/Android, breaking standard polling.
**Recommended solution:** 
1. **Screen Share:** Cannot be strictly enforced without a native module. Use React Native's `AppState` to heavily penalize/terminate exams if the app is backgrounded (moved to background = immediate violation).
2. **AutoSave:** Migrate synchronous `localStorage` writes to `AsyncStorage`. Use `expo-background-fetch` or simply flush aggressively on `AppState` changes to `inactive`.
**Decision required from team:** Yes — Accept that true device-level screen recording is impossible on standard consumer mobile devices without MDM profiles, and rely on strict AppState background-detection instead.
**Files affected:** `frontend/src/cadet/hooks/useProctoring.js`, `frontend/src/cadet/hooks/useExamAutoSave.js`

---
### RISK-008: Environment Variables
**Severity:** MEDIUM
**Category:** Infrastructure
**Web behaviour:** Uses `import.meta.env.VITE_API_URL` injected at build-time by Vite.
**Problem in React Native:** React Native bundler (Metro) does not natively support `.env` files in the same way Vite does without plugins.
**Recommended solution:** Use `expo-env` or `react-native-config` to expose variables to the native build context.
**Decision required from team:** No
**Files affected:** `frontend/src/lib/api.js`

---
### RISK-009: Date/Time Formatting
**Severity:** MEDIUM
**Category:** Data
**Web behaviour:** Relies on native JavaScript `Date` object manipulations (`Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)`).
**Problem in React Native:** Different JavaScript cores (Hermes vs V8/JSC) can sometimes parse ISO strings inconsistently, though modern Hermes is quite good.
**Recommended solution:** Audit date parsing. Standardize on ISO-8601 strings in API payloads, and consider introducing `date-fns` if timezone bugs arise during cross-platform testing.
**Decision required from team:** No
**Files affected:** `frontend/src/cadet/pages/Dashboard.jsx`, `frontend/src/cadet/pages/ExamAttempt.jsx`

---
### RISK-010: Print / PDF Generation
**Severity:** MEDIUM
**Category:** Platform-API
**Web behaviour:** The codebase currently handles PDFs mostly as static downloads via standard `<a href>` tags.
**Problem in React Native:** Mobile apps cannot just "download" a file without managing the file system and providing intent viewers.
**Recommended solution:** Use `expo-file-system` to download PDFs to the device cache, and `expo-sharing` or `expo-intent-launcher` to open the PDF in the user's preferred native document viewer.
**Decision required from team:** No
**Files affected:** `frontend/src/cadet/pages/Materials.jsx`

---
### RISK-011: Meta Tags & Browser Chrome
**Severity:** LOW
**Category:** UI
**Web behaviour:** The Vite app includes a `manifest.json`, favicons, and likely dynamic document titles.
**Problem in React Native:** Irrelevant in native applications.
**Recommended solution:** Manage branding natively through `app.json` (Expo config) for the app icon and splash screen.
**Decision required from team:** No
**Files affected:** `frontend/index.html`

---
### RISK-012: Analytics & Tracking
**Severity:** LOW
**Category:** Infrastructure
**Web behaviour:** If any standard tracking scripts exist (none detected explicitly, but potentially injected in production HTML).
**Problem in React Native:** Web pixel trackers don't work natively.
**Recommended solution:** Use native SDKs for Crashlytics or PostHog if tracking is required later.
**Decision required from team:** No
**Files affected:** N/A

---

## Risk Summary Table

| ID | Title | Severity | Category | Decision needed? |
|----|-------|----------|----------|-----------------|
| RISK-001 | Token Storage & Authentication Flow | CRITICAL | Auth | Yes |
| RISK-002 | File Uploads & CSV Processing | CRITICAL | Platform-API | Yes |
| RISK-003 | Server-Side Rendering Dependency | CRITICAL | Infrastructure | No (Mitigated) |
| RISK-004 | Browser History & Back-Button Traps | HIGH | Navigation | No |
| RISK-005 | CSS Flexbox Defaults & Layout Assumptions | HIGH | UI | Yes |
| RISK-006 | Third-Party Web-Only Libraries (recharts) | HIGH | UI | Yes |
| RISK-007 | Proctoring, WebRTC & Background State | HIGH | Platform-API | Yes |
| RISK-008 | Environment Variables | MEDIUM | Infrastructure | No |
| RISK-009 | Date/Time Formatting | MEDIUM | Data | No |
| RISK-010 | Print / PDF Generation | MEDIUM | Platform-API | No |
| RISK-011 | Meta Tags & Browser Chrome | LOW | UI | No |
| RISK-012 | Analytics & Tracking | LOW | Infrastructure | No |

---

## Recommended Build Order for React Native

To maximize momentum and isolate complex platform-specific integrations until the foundation is solid, the React Native rebuild should follow this sequence:

1. **Phase 1: Foundation (RISK-001, RISK-005)**
   - *Target:* Authentication flows (`Login`) and base layout structure.
   - *Reasoning:* SecureStore auth is required before any protected screen can be viewed. Setting up the layout system (`NativeWind`) early prevents styling debt later.
2. **Phase 2: Core Read-Only Views (RISK-009, RISK-006)**
   - *Target:* `CadetDashboard`, `Results`, `Profile`.
   - *Reasoning:* These views verify the JWT integration and API fetching wrappers work on mobile. Recharts replacement (`react-native-chart-kit`) can be integrated safely here.
3. **Phase 3: The Exam Engine (RISK-004, RISK-007)**
   - *Target:* `ExamAttempt`.
   - *Reasoning:* This is the most complex frontend component. It requires rewriting `useExamAutoSave` for `AsyncStorage`, replacing browser history traps with `BackHandler`, and substituting WebRTC screen sharing with strict `AppState` background tracking.
4. **Phase 4: Admin Mutations (RISK-002)**
   - *Target:* `ExamCreate`, `UserManagement` (CSV Uploads).
   - *Reasoning:* Implementing file system pickers (`expo-document-picker`) and standardizing multi-part form payloads for mobile is tricky and should be done after the primary user (Cadet) flows are complete.
5. **Phase 5: File Viewing (RISK-010)**
   - *Target:* `Materials` (PDF viewing).
   - *Reasoning:* Low priority. Setting up native intent launchers for downloaded study materials is a nice-to-have polishing step.
