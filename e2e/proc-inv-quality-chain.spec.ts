import { test, expect } from '@playwright/test';

test.describe('PROC → INV → Quality chain (W116)', () => {
  test('cross-module navigation chain', async ({ page }) => {
    await page.goto('/proc');
    await expect(page.locator('body')).toContainText(/Zaopatrzen|Procurement|Zamówienia/i, { timeout: 20000 });

    await page.goto('/inv');
    await expect(page.locator('body')).toContainText(/Magazyn|INV|Asortyment/i, { timeout: 20000 });

    await page.goto('/quality');
    await expect(page.locator('body')).toContainText(/Quality|ISO|NCR|CAPA/i, { timeout: 20000 });
  });
});
