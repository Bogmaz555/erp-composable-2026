import { test, expect } from '@playwright/test';

test.describe('INV Module (W92)', () => {
  test('inventory page shows central warehouse', async ({ page }) => {
    await page.goto('/inv');
    await expect(page.locator('body')).toContainText(/Magazyn|INV|Asortyment/i, { timeout: 20000 });
  });
});
