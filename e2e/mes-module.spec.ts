import { test, expect } from '@playwright/test';

test.describe('MES Module (W100)', () => {
  test('mes terminal page loads', async ({ page }) => {
    await page.goto('/mes');
    await expect(page.locator('body')).toContainText(/Kiosk|MES|Shopfloor/i, { timeout: 20000 });
  });
});
