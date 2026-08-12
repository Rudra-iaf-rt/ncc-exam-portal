# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.js >> Authentication Flows >> Admin Login >> should show error toast with invalid admin credentials
- Location: tests\e2e\auth.spec.js:47:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('#login-email')

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
  3  | test.describe('Authentication Flows', () => {
  4  |   
  5  |   test.describe('Cadet (Student) Login', () => {
  6  |     test.beforeEach(async ({ page }) => {
  7  |       await page.goto('/');
  8  |     });
  9  | 
  10 |     test('should show validation errors on empty submission', async ({ page }) => {
  11 |       await page.getByRole('button', { name: /ACCESS PORTAL/i }).click();
  12 |       
  13 |       // Native HTML5 validation will prevent submission, but we can check if it stays on the page
  14 |       await expect(page.getByRole('heading', { name: 'NCC Tirupati Unit' })).toBeVisible();
  15 |     });
  16 | 
  17 |     test('should show error toast with invalid credentials', async ({ page }) => {
  18 |       await page.locator('#regNo').fill('INVALID/123');
  19 |       await page.locator('#password').fill('wrongpassword');
  20 |       await page.getByRole('button', { name: /ACCESS PORTAL/i }).click();
  21 | 
  22 |       // Expect a toast error message
  23 |       const toast = page.locator('li[data-type="error"]');
  24 |       await expect(toast).toBeVisible();
  25 |       await expect(toast).toContainText(/failed|invalid/i);
  26 |     });
  27 | 
  28 |     test('should successfully login and navigate to dashboard with valid credentials', async ({ page }) => {
  29 |       // NOTE: Replace these with actual valid test credentials from the local database
  30 |       await page.locator('#regNo').fill('CADET001');
  31 |       await page.locator('#password').fill('password123');
  32 |       await page.getByRole('button', { name: /ACCESS PORTAL/i }).click();
  33 | 
  34 |       // Expect to be redirected to dashboard
  35 |       await expect(page).toHaveURL(/\/cadet\/dashboard/);
  36 |       
  37 |       // Optionally check for some dashboard element
  38 |       await expect(page.getByText(/Dashboard/i)).toBeVisible();
  39 |     });
  40 |   });
  41 | 
  42 |   test.describe('Admin Login', () => {
  43 |     test.beforeEach(async ({ page }) => {
  44 |       await page.goto('/admin/login');
  45 |     });
  46 | 
  47 |     test('should show error toast with invalid admin credentials', async ({ page }) => {
> 48 |       await page.locator('#login-email').fill('admin@ncc.gov.in');
     |                                          ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  49 |       await page.locator('#login-password').fill('wrongpassword');
  50 |       await page.getByRole('button', { name: /Sign In/i }).click();
  51 | 
  52 |       // Expect a toast error message
  53 |       const toast = page.locator('li[data-type="error"]');
  54 |       await expect(toast).toBeVisible();
  55 |       await expect(toast).toContainText(/failed|verify/i);
  56 |     });
  57 | 
  58 |     test('should successfully login and navigate to admin dashboard with valid credentials', async ({ page }) => {
  59 |       // NOTE: Replace these with actual valid test credentials from the local database
  60 |       await page.locator('#login-email').fill('admin@ncc.gov.in');
  61 |       await page.locator('#login-password').fill('admin123');
  62 |       await page.getByRole('button', { name: /Sign In/i }).click();
  63 | 
  64 |       // Expect to be redirected to admin dashboard
  65 |       await expect(page).toHaveURL(/\/admin\/dashboard/);
  66 |       
  67 |       // Optionally check for some dashboard element
  68 |       await expect(page.getByText(/Dashboard/i).first()).toBeVisible();
  69 |     });
  70 |   });
  71 | });
  72 | 
```