# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-flow.spec.js >> Admin E2E Flow >> should navigate to Exams list
- Location: tests\e2e\admin-flow.spec.js:16:3

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('#login-email')

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Admin E2E Flow', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/admin/login');
  6  |     
  7  |     // Login as Admin
> 8  |     await page.locator('#login-email').fill('admin@ncc.gov.in');
     |                                        ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  9  |     await page.locator('#login-password').fill('admin123');
  10 |     await page.getByRole('button', { name: /Sign In/i }).click();
  11 | 
  12 |     // Verify successful login
  13 |     await expect(page).toHaveURL(/\/admin\/dashboard/);
  14 |   });
  15 | 
  16 |   test('should navigate to Exams list', async ({ page }) => {
  17 |     // Look for link to exams
  18 |     await page.getByRole('link', { name: /Exams/i }).first().click();
  19 |     await expect(page).toHaveURL(/\/admin\/exams/);
  20 |     
  21 |     // Ensure "Create New Exam" button is visible
  22 |     await expect(page.getByRole('link', { name: /Create/i })).toBeVisible();
  23 |   });
  24 | 
  25 |   test('should navigate to Create Exam page', async ({ page }) => {
  26 |     await page.goto('/admin/exams/create');
  27 |     
  28 |     // Check if the form renders
  29 |     await expect(page.getByRole('heading', { name: /Create New Exam/i })).toBeVisible();
  30 |     
  31 |     // Should have basic input fields
  32 |     await expect(page.getByLabel(/Title/i)).toBeVisible();
  33 |     await expect(page.getByLabel(/Duration/i)).toBeVisible();
  34 |   });
  35 | 
  36 |   test('should navigate to Users Management page', async ({ page }) => {
  37 |     await page.getByRole('link', { name: /Users/i }).first().click();
  38 |     await expect(page).toHaveURL(/\/admin\/users/);
  39 |     
  40 |     // Expect the Add User button or table to appear
  41 |     await expect(page.getByRole('heading', { name: /Manage Cadets/i })).toBeVisible();
  42 |   });
  43 | });
  44 | 
```