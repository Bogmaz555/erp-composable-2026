import { test, expect } from '@playwright/test';

test.describe('HR → PLM → PM chain (W124)', () => {
  test('cross-module navigation chain', async ({ page }) => {
    await page.goto('/hr');
    await expect(page.locator('body')).toContainText(/HR|Kadry|Pracownik/i, { timeout: 20000 });

    await page.goto('/plm');
    await expect(page.locator('body')).toContainText(/PLM|Inżynieryjne|ECO/i, { timeout: 20000 });

    await page.goto('/pm');
    await expect(page.locator('body')).toContainText(/Projekt|PM|Rejestr/i, { timeout: 20000 });
  });
});
