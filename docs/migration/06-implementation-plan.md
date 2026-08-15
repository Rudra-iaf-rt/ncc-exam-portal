# Phase 6: Implementation Plan Output

## Phase 0: Project Setup
- [ ] Initialize Expo app with `expo-router` (if not already scaffolded).
- [ ] Install NativeWind and configure it with the extracted design tokens from Phase 2.
- [ ] Set up `expo-secure-store`, `lucide-react-native`.
- [ ] Create folder structure (`app/`, `components/`, `api/`, `contexts/`).
- [ ] Build placeholder screens for every row in the Phase 4 Screen Map.

## Phase 1: Core UI Kit
- [ ] Implement `Typography` components mapping to Noto Sans.
- [ ] Build base UI components: `Button`, `Input` (wrapped in `KeyboardAvoidingView`), `Card`.
- [ ] Implement `Bottom Sheet` modal component (`@gorhom/bottom-sheet`).
- [ ] Build a local Styleguide screen to visually verify 1:1 match with web tokens.

## Phase 2: Auth & Contexts
- [ ] Port `api/client.js` and modify it to use `expo-secure-store`.
- [ ] Port `AdminAuthContext` and Cadets Auth logic.
- [ ] Build `CadetLoginScreen` and `AdminLoginScreen`.
- [ ] Wire up routing guards (using `expo-router`'s redirect mechanism).

## Phase 3: Screen-by-Screen Build (Cadet Portal)
- [ ] `CadetDashboardScreen`: Convert grid to vertical cards.
- [ ] `CadetResultsScreen`: Implement `FlatList` for past exam cards.
- [ ] `CadetMaterialsScreen`: Implement list for PDFs/materials.
- [ ] `CadetProfileScreen`: Map profile form.
- [ ] `ExamAttemptScreen`: High complexity. Migrate the timer, question traversal logic, and ensure `AppState` locks down the exam.

## Phase 4: Screen-by-Screen Build (Admin Portal)
- [ ] `AdminDashboardScreen`
- [ ] `AdminExamListScreen`
- [ ] `AdminResultsScreen`
- [ ] `UserManagementScreen`

## Phase 5: Native Enhancements (Bucket C)
- [ ] Implement `expo-haptics` on critical buttons (Submit Exam, Login).
- [ ] Implement `expo-local-authentication` for Biometric Login.
- [ ] Add pull-to-refresh to all major list screens (`FlatList` refresh props).

## Phase 6: Polish & Release
- [ ] Handle Empty States and Loading Skeletons.
- [ ] App Icon and Splash Screen configuration.
- [ ] Test critical flows (Auth -> Take Exam -> See Results).
- [ ] EAS Build configuration for iOS/Android testflight/APK.
