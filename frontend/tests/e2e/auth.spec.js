import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  
  test.describe('Cadet (Student) Login', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
    });

    test('should show validation errors on empty submission', async ({ page }) => {
      await page.getByRole('button', { name: /ACCESS PORTAL/i }).click();
      
      // Native HTML5 validation will prevent submission, but we can check if it stays on the page
      await expect(page.getByRole('heading', { name: 'NCC Tirupati Unit' })).toBeVisible();
    });

    test('should show error toast with invalid credentials', async ({ page }) => {
      await page.locator('#regNo').fill('INVALID/123');
      await page.locator('#password').fill('wrongpassword');
      await page.getByRole('button', { name: /ACCESS PORTAL/i }).click();

      // Expect a toast error message
      const toast = page.locator('li[data-type="error"]');
      await expect(toast).toBeVisible();
      await expect(toast).toContainText(/failed|invalid/i);
    });

    test('should successfully login and navigate to dashboard with valid credentials', async ({ page }) => {
      // NOTE: Replace these with actual valid test credentials from the local database
      await page.locator('#regNo').fill('CADET001');
      await page.locator('#password').fill('password123');
      await page.getByRole('button', { name: /ACCESS PORTAL/i }).click();

      // Expect to be redirected to dashboard
      await expect(page).toHaveURL(/\/cadet\/dashboard/);
      
      // Optionally check for some dashboard element
      await expect(page.getByText(/Dashboard/i)).toBeVisible();
    });
  });

  test.describe('Admin Login', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/admin/login');
    });

    test('should show error toast with invalid admin credentials', async ({ page }) => {
      await page.locator('#login-email').fill('admin@ncc.gov.in');
      await page.locator('#login-password').fill('wrongpassword');
      await page.getByRole('button', { name: /Sign In/i }).click();

      // Expect a toast error message
      const toast = page.locator('li[data-type="error"]');
      await expect(toast).toBeVisible();
      await expect(toast).toContainText(/failed|verify/i);
    });

    test('should successfully login and navigate to admin dashboard with valid credentials', async ({ page }) => {
      // NOTE: Replace these with actual valid test credentials from the local database
      await page.locator('#login-email').fill('admin@ncc.gov.in');
      await page.locator('#login-password').fill('admin123');
      await page.getByRole('button', { name: /Sign In/i }).click();

      // Expect to be redirected to admin dashboard
      await expect(page).toHaveURL(/\/admin\/dashboard/);
      
      // Optionally check for some dashboard element
      await expect(page.getByText(/Dashboard/i).first()).toBeVisible();
    });
  });
});
