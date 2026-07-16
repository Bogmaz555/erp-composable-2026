import { test, expect } from '@playwright/test';

test.describe('PROC Module (W96)', () => {
  test('procurement page loads', async ({ page }) => {
    await page.goto('/proc');
    await expect(page.locator('body')).toContainText(/Zaopatrzen|Procurement|Zamówienia/i, { timeout: 20000 });
  });
});
