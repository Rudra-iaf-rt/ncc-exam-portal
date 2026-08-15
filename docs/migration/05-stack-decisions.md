# Phase 5: Technical Stack Decisions

- **Framework**: **Expo (Managed Workflow)**. Provides the fastest path from web to mobile, built-in OTA updates, and native module auto-linking. `expo-router` will be used for file-based routing, mirroring React Router's nested structures.
- **Navigation**: **Expo Router (built on React Navigation)**. We will use `Tabs` for the main Cadet/Admin portals and `Stack` for authentication and drilling into specific screens (e.g., `ExamAttempt`).
- **Styling**: **NativeWind (v4)**. Since the web app uses Tailwind CSS v4, NativeWind allows us to reuse ~80-90% of the styling logic and utility classes directly on `View` and `Text` components. The custom CSS variables in `index.css` will be ported to the `tailwind.config.js` or theme file for NativeWind.
- **State Management**: **React Context**. We will carry over the existing `NavigationContext`, `AdminAuthContext`, and `ConfirmContext` as they are framework-agnostic.
- **Data Fetching**: **Axios** with the existing `api/client.js`. The interceptors will be modified to pull the JWT token from `expo-secure-store` instead of `localStorage`/cookies. The custom hooks (`useCachedFetch`, `useTimedFetch`) can be ported directly.
- **Icons**: `@expo/vector-icons` (has Lucide) or `lucide-react-native`. Since the web app uses `lucide-react`, `lucide-react-native` provides exact parity.
- **Auth Token Storage**: **`expo-secure-store`**. A drop-in replacement for web storage that encrypts tokens via iOS Keychain and Android Keystore.
- **Testing**: **Jest + React Native Testing Library**. E2E flows can be handled later via **Maestro**.
