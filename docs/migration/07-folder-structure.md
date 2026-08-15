# Phase 7: Production-Grade Folder Structure

For a robust, scalable React Native app using Expo Router, a **Feature-Driven Architecture** is utilized. This separates the routing layer (`app/`) from the business logic and UI components (`src/`), ensuring the codebase remains maintainable as the portal grows.

The structure uses a shared route tree (`(app)`) that delegates to role-specific components, avoiding duplicate routes for Cadets and Admins, and implements strict barrel files (`index.ts`) for clean module boundaries.

```text
/
├── app/                              # EXPO ROUTER: routing only, screens stay thin
│   ├── (auth)/                       # Public auth flow
│   │   ├── _layout.tsx               # Stack layout, redirects away if already logged in
│   │   ├── login.tsx                 # /login
│   │   └── forgot-password.tsx       # /forgot-password
│   │
│   ├── (app)/                        # Authenticated shell — SHARED route tree for all roles
│   │   ├── _layout.tsx               # Auth guard: resolves session, <Redirect> to /login if none
│   │   ├── (tabs)/                   # Bottom tabs — same paths for every role
│   │   │   ├── _layout.tsx           # Reads role from useAuth(), renders role-specific tab set
│   │   │   ├── dashboard.tsx         # /dashboard → delegates to <CadetDashboard/> or <AdminDashboard/>
│   │   │   ├── results.tsx           # /results  → cadet-only tab, hidden for admin
│   │   │   ├── materials.tsx         # /materials
│   │   │   └── profile.tsx           # /profile → shared, content varies by role
│   │   ├── exam/                     # Exam flow (cadet), hidden tab bar
│   │   │   ├── [id].tsx              # /exam/123 → <ExamScreen/> from features/exam
│   │   │   └── review/
│   │   │       └── [id].tsx          # /exam/review/123
│   │   └── manage/                   # Admin-only deep screens, guarded again at _layout
│   │       ├── _layout.tsx           # Role guard: <Redirect> to /dashboard if not admin
│   │       └── users.tsx             # /manage/users
│   │
│   ├── _layout.tsx                   # Root layout: providers, splash-hide logic
│   └── +not-found.tsx                # Global 404
│
├── src/
│   ├── features/                     # Domain-driven modules
│   │   ├── auth/
│   │   │   ├── api/                  # login, refreshToken, forgotPassword
│   │   │   ├── components/           # LoginForm, BiometricPrompt
│   │   │   ├── hooks/                # useAuth, useLogin, useSession
│   │   │   ├── types.ts
│   │   │   └── index.ts              # Barrel: only exports what other layers may use
│   │   ├── exam/
│   │   │   ├── api/
│   │   │   ├── components/           # Timer, QuestionRenderer, OptionList
│   │   │   ├── hooks/                # useExamTimer, useSubmitExam
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── cadet/
│   │   │   ├── components/           # CadetDashboard, CadetResultsView
│   │   │   ├── hooks/
│   │   │   └── index.ts
│   │   └── admin/
│   │       ├── components/           # AdminDashboard, UserManagementTable
│   │       ├── hooks/
│   │       └── index.ts
│   │
│   ├── components/                   # Global design system — no business logic
│   │   ├── ui/                       # Button, Text, Card, Badge, BottomSheet
│   │   ├── forms/                    # Input, Checkbox, Select
│   │   └── layout/                   # ScreenWrapper, KeyboardAvoidingWrapper
│   │
│   ├── core/                         # App-wide infrastructure
│   │   ├── api/                      # Axios/fetch client, interceptors, error mapping
│   │   ├── theme/                    # Design tokens, NativeWind config source
│   │   ├── storage/                  # secure-store + MMKV wrappers
│   │   ├── config/                   # env.ts — reads app.config.ts extras, typed & validated
│   │   └── utils/                    # date formatters, validators, formatters
│   │
│   ├── hooks/                        # Cross-feature hooks: useDebounce, useNetworkStatus
│   │
│   ├── types/                        # Cross-feature types: API envelope, NavParamList, Role enum
│   │
│   └── contexts/                     # ONLY truly global, rarely-changing state
│       └── AuthContext.tsx           # Session + role. (Server data → React Query, not Context)
│
├── assets/
│   ├── fonts/
│   ├── images/
│   └── icons/
│
├── app.config.ts                     # Dynamic config: bundle ID/API URL/name per EAS build profile
├── tailwind.config.js                # content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"]
├── eas.json                          # Build profiles: development / preview / production
└── package.json
```
