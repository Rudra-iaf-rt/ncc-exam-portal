import { test, expect } from '@playwright/test';

test.describe('Cadet Exam Taking Flow', () => {
  // Use a predefined test cadet
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Login as cadet
    await page.locator('#regNo').fill('CADET001');
    await page.locator('#password').fill('password123');
    await page.getByRole('button', { name: /ACCESS PORTAL/i }).click();

    // Ensure we reached the dashboard
    await expect(page).toHaveURL(/\/cadet\/dashboard/);
  });

  test('should see assigned exams and navigate to instructions', async ({ page }) => {
    // Assuming there's a card or button to start an exam
    // We look for a start button (this selector might need adjustment based on actual UI)
    const startButton = page.getByRole('button', { name: /Start Exam/i }).first();
    
    // If there is an assigned exam, we can click it
    if (await startButton.isVisible()) {
      await startButton.click();
      
      // Should show instructions page or directly enter exam
      // Wait for navigation
      await expect(page).toHaveURL(/\/exam\/\d+/);
      
      // Look for the exam title or a submit button
      await expect(page.getByRole('button', { name: /Submit/i })).toBeVisible();
    }
  });

  test('should view results for past exams', async ({ page }) => {
    // Navigate to results tab
    await page.getByRole('link', { name: /Results/i }).click();
    await expect(page).toHaveURL(/\/cadet\/results/);
    
    // Expect the page title to be visible
    await expect(page.getByRole('heading', { name: /Performance Record/i })).toBeVisible();
  });
});
