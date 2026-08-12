import { test, expect } from '@playwright/test';

test.describe('Admin E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login');
    
    // Login as Admin
    await page.locator('#login-email').fill('admin@ncc.gov.in');
    await page.locator('#login-password').fill('admin123');
    await page.getByRole('button', { name: /Sign In/i }).click();

    // Verify successful login
    await expect(page).toHaveURL(/\/admin\/dashboard/);
  });

  test('should navigate to Exams list', async ({ page }) => {
    // Look for link to exams
    await page.getByRole('link', { name: /Exams/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/exams/);
    
    // Ensure "Create New Exam" button is visible
    await expect(page.getByRole('link', { name: /Create/i })).toBeVisible();
  });

  test('should navigate to Create Exam page', async ({ page }) => {
    await page.goto('/admin/exams/create');
    
    // Check if the form renders
    await expect(page.getByRole('heading', { name: /Create New Exam/i })).toBeVisible();
    
    // Should have basic input fields
    await expect(page.getByLabel(/Title/i)).toBeVisible();
    await expect(page.getByLabel(/Duration/i)).toBeVisible();
  });

  test('should navigate to Users Management page', async ({ page }) => {
    await page.getByRole('link', { name: /Users/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/users/);
    
    // Expect the Add User button or table to appear
    await expect(page.getByRole('heading', { name: /Manage Cadets/i })).toBeVisible();
  });
});
