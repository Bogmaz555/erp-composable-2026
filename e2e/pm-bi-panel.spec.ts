import { test, expect } from '@playwright/test';

test.describe('PM BI Panel (W76)', () => {
  test('dashboard tab shows live BI read model', async ({ page }) => {
    await page.goto('/pm');
    await page.getByRole('button', { name: 'Rejestr Projektów' }).click();
    const openBtn = page.getByRole('button', { name: /Otwórz/i }).first();
    if (await openBtn.count()) {
      await openBtn.click();
    }
    await page.getByRole('button', { name: 'Dashboard' }).click();
    await expect(page.locator('body')).toContainText(/BI Read Model/i, { timeout: 20000 });
  });
});
