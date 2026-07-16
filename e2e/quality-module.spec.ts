import { test, expect } from '@playwright/test';

test.describe('Quality Module (W96)', () => {
  test('quality page loads', async ({ page }) => {
    await page.goto('/quality');
    await expect(page.locator('body')).toContainText(/Quality|ISO|NCR|CAPA/i, { timeout: 20000 });
  });
});
