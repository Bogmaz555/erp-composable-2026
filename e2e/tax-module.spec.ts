import { test, expect } from '@playwright/test';

test.describe('Tax Module (W104)', () => {
  test('tax ksef page loads', async ({ page }) => {
    await page.goto('/tax');
    await expect(page.locator('body')).toContainText(/Tax|KSeF|JPK/i, { timeout: 20000 });
  });
});
