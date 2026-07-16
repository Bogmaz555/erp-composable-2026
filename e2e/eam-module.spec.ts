import { test, expect } from '@playwright/test';

test.describe('EAM Module (W100)', () => {
  test('eam maintenance page loads', async ({ page }) => {
    await page.goto('/eam');
    await expect(page.locator('body')).toContainText(/EAM|Work Orders|Harmonogram/i, { timeout: 20000 });
  });
});
