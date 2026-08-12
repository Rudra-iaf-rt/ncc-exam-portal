# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: exam-taking.spec.js >> Cadet Exam Taking Flow >> should see assigned exams and navigate to instructions
- Location: tests\e2e\exam-taking.spec.js:17:3

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('#regNo')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]: "[plugin:vite:oxc] Transform failed with 2 errors: [PARSE_ERROR] Error: Identifier `loading` has already been declared ╭─[ src/admin/pages/MaterialManagement.jsx:216:32 ] │ 216 │ const { data: materialsData, loading, refetch } = useCachedFetch(null); │ ───┬─── │ ╰───── `loading` has already been declared here │ 229 │ const { data, loading, refetch } = useCachedFetch( │ ───┬─── │ ╰───── It can not be redeclared here ─────╯ [PARSE_ERROR] Error: Identifier `refetch` has already been declared ╭─[ src/admin/pages/MaterialManagement.jsx:216:41 ] │ 216 │ const { data: materialsData, loading, refetch } = useCachedFetch(null); │ ───┬─── │ ╰───── `refetch` has already been declared here │ 229 │ const { data, loading, refetch } = useCachedFetch( │ ───┬─── │ ╰───── It can not be redeclared here ─────╯"
  - generic [ref=e5]: C:/College Projects/ncc-exam-portal/frontend/src/admin/pages/MaterialManagement.jsx
  - generic [ref=e6]: at transformWithOxc (file:///C:/College%20Projects/ncc-exam-portal/frontend/node_modules/vite/dist/node/chunks/node.js:3745:19) at TransformPluginContext.transform (file:///C:/College%20Projects/ncc-exam-portal/frontend/node_modules/vite/dist/node/chunks/node.js:3813:26) at EnvironmentPluginContainer.transform (file:///C:/College%20Projects/ncc-exam-portal/frontend/node_modules/vite/dist/node/chunks/node.js:30143:51) at async loadAndTransform (file:///C:/College%20Projects/ncc-exam-portal/frontend/node_modules/vite/dist/node/chunks/node.js:24468:26) at async viteTransformMiddleware (file:///C:/College%20Projects/ncc-exam-portal/frontend/node_modules/vite/dist/node/chunks/node.js:24262:20)
  - generic [ref=e7]:
    - text: Click outside, press Esc key, or fix the code to dismiss.You can also disable this overlay by setting
    - code [ref=e8]: server.hmr.overlay
    - text: to
    - code [ref=e9]: "false"
    - text: in
    - code [ref=e10]: vite.config.js
    - text: .
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Cadet Exam Taking Flow', () => {
  4  |   // Use a predefined test cadet
  5  |   test.beforeEach(async ({ page }) => {
  6  |     await page.goto('/');
  7  |     
  8  |     // Login as cadet
> 9  |     await page.locator('#regNo').fill('CADET001');
     |                                  ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  10 |     await page.locator('#password').fill('password123');
  11 |     await page.getByRole('button', { name: /ACCESS PORTAL/i }).click();
  12 | 
  13 |     // Ensure we reached the dashboard
  14 |     await expect(page).toHaveURL(/\/cadet\/dashboard/);
  15 |   });
  16 | 
  17 |   test('should see assigned exams and navigate to instructions', async ({ page }) => {
  18 |     // Assuming there's a card or button to start an exam
  19 |     // We look for a start button (this selector might need adjustment based on actual UI)
  20 |     const startButton = page.getByRole('button', { name: /Start Exam/i }).first();
  21 |     
  22 |     // If there is an assigned exam, we can click it
  23 |     if (await startButton.isVisible()) {
  24 |       await startButton.click();
  25 |       
  26 |       // Should show instructions page or directly enter exam
  27 |       // Wait for navigation
  28 |       await expect(page).toHaveURL(/\/exam\/\d+/);
  29 |       
  30 |       // Look for the exam title or a submit button
  31 |       await expect(page.getByRole('button', { name: /Submit/i })).toBeVisible();
  32 |     }
  33 |   });
  34 | 
  35 |   test('should view results for past exams', async ({ page }) => {
  36 |     // Navigate to results tab
  37 |     await page.getByRole('link', { name: /Results/i }).click();
  38 |     await expect(page).toHaveURL(/\/cadet\/results/);
  39 |     
  40 |     // Expect the page title to be visible
  41 |     await expect(page.getByRole('heading', { name: /Performance Record/i })).toBeVisible();
  42 |   });
  43 | });
  44 | 
```