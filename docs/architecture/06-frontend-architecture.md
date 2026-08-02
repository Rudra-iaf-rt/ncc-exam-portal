# Chapter 6: Frontend Architecture (React SPA)

The Client Tier is a robust React 19 Single Page Application (SPA) compiled via Vite. It is strictly separated into two psychological and architectural domains: The Cadet Portal (Locked down, high stress, minimalistic) and the Admin Console (Data-heavy, analytical, complex grids).

## 6.1 State Management Philosophy

The frontend aggressively minimizes global state.
- **Local Component State (`useState`):** Used for highly ephemeral UI states (dropdown toggles, modal visibility).
- **Context API (`useContext`):** Used strictly for globally required configurations that rarely change (e.g., `AuthContext` for user metadata, `NavigationContext` for active routes).
- **Exam Sandbox State:** During an active exam, state is highly localized to the `ExamAttempt` component. Answers are maintained in a local `Ref` or fast-updating state to ensure zero input latency when clicking options, entirely decoupled from the async network request lifecycle.

## 6.2 Routing & Navigation Guards

The `App.jsx` serves as the routing manifest, employing Higher Order Components (HOCs) to enforce boundary protection before rendering components.

```javascript
<Route element={<RequireCadet />}>
  <Route element={<CadetLayout />}>
    <Route path="/cadet/dashboard" element={<CadetDashboard />} />
    ...
  </Route>
</Route>
```
**The Guard Mechanism (`RequireCadet.jsx`):**
1. Intercepts the route load.
2. Checks the `AuthContext` to ensure a valid JWT exists.
3. Checks if `user.role === 'CADET'`.
4. If invalid, executes a programmatic `<Navigate to="/" replace />` to boot the user back to the login screen.

## 6.3 The Exam Attempt Sandbox (`ExamAttempt.jsx`)

This is the most critical piece of frontend engineering in the portal.

### 6.3.1 Timer Decoupling
If a React component relies on `setInterval` to update a `timeLeft` state variable every second, it will force the entire component tree to re-render 60 times a minute. This causes input lag.
- **Solution:** The timer logic is extracted into an isolated, memoized `<ExamTimer />` component. It reads the absolute `expiresAt` timestamp from the server and handles its own localized re-renders.

### 6.3.2 Debounced Network Syncing
To prevent DDoS-ing our own server when a Cadet clicks options rapidly:
```javascript
// Simplified Concept
const handleOptionSelect = (qId, option) => {
    updateLocalState(qId, option); // Instant UI feedback
    
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
        api.patch('/api/exams/save', { answers: getLocalState() });
    }, 1000); // Only sends to network after 1 second of inactivity
}
```

## 6.4 UI/UX & Design System Constraints

The portal adheres to strict design constraints outlined in `PRODUCT.md`:
- **Discipline & Precision:** Heavy reliance on solid borders, precise grid alignments, and a constrained color palette (Navy, Gold, Stone, White).
- **Error Resiliency:** Vague error messages are forbidden. If a network request fails, the `Sonner` Toast library must display actionable feedback (e.g., "Network offline. Answers queued locally.").
- **Performance:** `react-window` or virtualized lists are mandated for the Admin Console when rendering thousands of cadet records or telemetry logs to prevent DOM node exhaustion and browser freezing.
