# Phase 4: Screen-by-Screen Migration Map

| Web Route | Purpose | Maps to RN Screen | Nav placement | Data source | Bucket B changes needed | Bucket C opportunities | Complexity |
|---|---|---|---|---|---|---|---|
| `/` | Cadet Login | `CadetLoginScreen` | Root Stack | `auth.js` API | `KeyboardAvoidingView` | Biometric Login | S |
| `/forgot-password` | Password Recovery | `ForgotPasswordScreen`| Root Stack | `auth.js` API | Native Inputs | - | S |
| `/cadet/dashboard` | Cadet Home | `CadetDashboardScreen`| Bottom Tab | `exam.js` API | Grid to vertical stack | Pull to refresh | M |
| `/cadet/results` | Past Scores | `CadetResultsScreen` | Bottom Tab | `leaderboard.js` API | Use `FlatList` | - | S |
| `/cadet/materials` | Study Docs | `CadetMaterialsScreen`| Bottom Tab | `materials.js` API | List -> `FlatList` | Offline storage (Backlog)| M |
| `/cadet/profile` | Settings | `CadetProfileScreen` | Bottom Tab | `auth.js` API | Form fields -> native | - | S |
| `/exam/:id` | Active Exam | `ExamAttemptScreen` | Modal Stack | `exam.js` API | Custom timer overlay | AppState monitoring to prevent cheating, Haptics | L |
| `/exam/review/:id`| Exam Review | `ExamReviewScreen` | Stack (from Results) | `exam.js` API | Optimize long lists | - | M |
| `/admin/login` | Admin Auth | `AdminLoginScreen` | Root Stack | `admin.js` API | `KeyboardAvoidingView` | Biometric Login | S |
| `/admin/dashboard`| Admin Home | `AdminDashboardScreen`| Admin Bottom Tab | `admin.js` API | Grid to vertical stack | - | M |
| `/admin/exams` | Manage Exams | `AdminExamListScreen` | Admin Bottom Tab | `admin.js` API | Use `FlatList`, Swipe actions | - | M |
| `/admin/results` | View Results | `AdminResultsScreen` | Admin Bottom Tab | `admin.js` API | Table -> Cards + `FlatList`| - | M |
| `/admin/exams/:id/monitor` | Live Exam Monitor | *Desktop Only?* | - | - | *May skip on mobile, dense tabular data* | - | L |
| `/admin/users` | Manage Cadets | `UserManagementScreen`| Admin Stack | `admin.js` API | Bottom Sheet for filters | - | M |

*Note: Some dense administrative pages (like Monitor Wall, Exam Analytics, College Management) might be deemed desktop-only based on stakeholder feedback, or simplified into card-based lists.*
