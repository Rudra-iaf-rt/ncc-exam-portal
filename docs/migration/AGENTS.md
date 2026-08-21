# NCC Portal — React Native App — AI Agent Instructions

## Project Identity
- **App Description:** A military examination and administration mobile platform for the NCC Tirupati Unit.
- **Roles:** 
  - **Admin:** Full system access (Exam creation, User Management, Logs, Colleges).
  - **Officer (Instructor):** Tenant-isolated access to manage their specific college's cadets and exams (if granted `canManageExams` permission).
  - **Cadet (Student):** End-user access to take proctored exams, view results, and access study materials.
- **Backend Environment:** Express/Node.js API backed by PostgreSQL (Prisma). Uses a hybrid JWT (Access Token) + Opaque (Refresh Token) authentication mechanism. The API uses a standard `/api` base URL pattern. Deep linking for auth resets uses the `ncc-exam://` scheme.
- **Target Platform:** Expo SDK (Latest Stable).

## Tech Stack
- **Navigation:** React Navigation v7 (stack + bottom tab)
- **Auth storage:** `expo-secure-store` (NOT AsyncStorage for tokens)
- **HTTP client:** `axios` with interceptors for JWT refresh
- **State:** `React Query` (Recommended for data fetching to replace the custom `resourceCache.js` polling/caching logic) + `Zustand` (for synchronous global UI/Auth state).
- **UI:** `NativeWind` (Highly recommended to smoothly migrate the extensive Tailwind CSS classes used in the web portal).
- **Forms:** `react-hook-form` + `zod`
- **File handling:** `expo-document-picker`, `expo-file-system`
- **Notifications:** `expo-notifications` (for real-time proctoring alerts and announcements)

## API Contract (summary)
- **Base URL pattern:** `EXPO_PUBLIC_API_URL + '/api'`
- **Auth header format:** `Authorization: Bearer <token>`
- **Token refresh endpoint:** `POST /api/auth/refresh` (requires payload `{ refreshToken }`)
- **Standard error response shape:** JSON object containing an `error` key (e.g., `{ "error": "Invalid credentials" }`).
- **Pagination pattern:** Standard offset/limit query parameters (`?page=1&limit=20`).

## Screen Inventory (link to 04_frontend_features.md)
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

## RBAC Rules (non-negotiable)
| Feature / Route | Admin | Instructor | Student (Cadet) |
|---|---|---|---|
| Take exams (`/exam/:id`) | ✗ | ✗ | ✓ |
| View own results/materials | ✗ | ✗ | ✓ |
| View global exam list | ✓ | ✓ | ✗ |
| View user/cadet list | ✓ | ✓ | ✗ |
| Create/Edit Exams | ✓ | ✓ (if `canManageExams`) | ✗ |
| Administer Groups/Materials | ✓ | ✓ | ✗ |
| Manage Colleges/Staff | ✓ | ✗ | ✗ |
| View Audit Logs | ✓ | ✗ | ✗ |

Never render a screen for a role that does not have access.
Gate at the navigation level AND at the component level.

## Coding Standards
- TypeScript strict mode, no `any`
- Zod for all API response validation (never trust raw API data)
- Every API call in a React Query query or mutation — no raw useEffect fetches
- No hardcoded strings visible to users — all in a constants/strings file
- No inline styles — all styling through NativeWind or StyleSheet.create
- Accessible: every interactive element has accessibilityLabel

## Do Not Do (migration anti-patterns)
- DO NOT use window.*, document.*, localStorage, sessionStorage
- DO NOT use react-router-dom — use React Navigation
- DO NOT store JWT in AsyncStorage — use SecureStore
- DO NOT use CSS files or Tailwind class strings directly — use NativeWind
- DO NOT use <a href> — use navigation.navigate()
- DO NOT use fetch() without the auth interceptor wrapper
- DO NOT implement a screen that the web portal guards — check the RBAC matrix first

## Risk Register Reference
"Before implementing any feature, check 06_migration_risk_register.md.
If the feature has a CRITICAL or HIGH risk entry, resolve the architecture
decision in that entry before writing any code."
