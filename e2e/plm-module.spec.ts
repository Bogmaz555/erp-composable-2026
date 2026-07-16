import { test, expect } from '@playwright/test';

test.describe('PLM Module (W108)', () => {
  test('plm engineering page loads', async ({ page }) => {
    await page.goto('/plm');
    await expect(page.locator('body')).toContainText(/PLM|Inżynieryjne|ECO/i, { timeout: 20000 });
  });
});
