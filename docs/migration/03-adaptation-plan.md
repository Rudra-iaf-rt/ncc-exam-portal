# Phase 3: Platform-Aware Adaptation Rules

## Bucket A — Carry over exactly (brand identity)
- **Colors**: The entire custom palette (Olive, Navy, Gold, Crimson, Stone, Ink) translates 1:1.
- **Typography**: Noto Sans and Noto Sans Mono will be used via `expo-font` to ensure the exact same typographic identity.
- **Iconography**: `lucide-react` icons migrate exactly to `lucide-react-native`.
- **Tone & Layout Rhythm**: Spacing rhythm matches the Tailwind scale from the web app.

## Bucket B — Must change (native-appropriate replacements)
- **Navigation**: Web sidebar/topbar will be replaced by `@react-navigation/bottom-tabs` for the primary Cadet/Admin views, and Native Stack Navigator for deep drill-downs (like `ExamAttempt`, `ExamReview`).
- **Modals/Overlays**: Web modals (like confirmation dialogs) will be replaced with native Bottom Sheets (`@gorhom/bottom-sheet`) for smoother, thumb-friendly interaction, except for critical destructive actions which will use `Alert`.
- **Hover States**: The web app's extensive `:hover` changes will be converted to `Pressable` opacity changes or scale-down effects using `react-native-reanimated` (`onPressIn`/`onPressOut`) to provide touch feedback.
- **Responsive Layouts**: Multi-column grids (like the Dashboard stats) will stack vertically on mobile phones. Tablets can retain grid via `useWindowDimensions`.
- **Forms & Inputs**: Native `KeyboardAvoidingView` will wrap all forms (like Login, Profile). Custom selects will be replaced by Bottom Sheets for selection or Native Pickers.
- **Scrolling**: Any mapped arrays generating long lists (like `ExamList`, `ResultsBoard`) will be converted to `FlatList` to maintain 60fps scrolling.
- **Toasts**: `sonner` will be replaced by a React Native equivalent like `react-native-toast-message`, styled to match the official NCC look defined in `App.jsx`.

## Bucket C — Native Opportunities (v1 / Backlog)
- **Push Notifications (v1)**: Notify cadets when a new exam is scheduled or results are published.
- **Biometric Login (v1)**: Allow FaceID / TouchID to skip typing credentials on the login screen.
- **Offline-first Caching (Backlog)**: Persist materials or past results using `MMKV` so cadets can review them without an active connection.
- **Haptics (v1)**: `expo-haptics` for tactile feedback when submitting an exam, answering a question, or encountering an error.
- **Preventing App Switch (v1)**: Use `AppState` to warn or automatically submit an exam if the cadet puts the app in the background during an active test.
