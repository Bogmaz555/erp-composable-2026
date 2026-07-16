import { test, expect } from '@playwright/test';

test.describe('HR Module (W108)', () => {
  test('hr page loads', async ({ page }) => {
    await page.goto('/hr');
    await expect(page.locator('body')).toContainText(/HR|Kadry|Pracownik/i, { timeout: 20000 });
  });
});
