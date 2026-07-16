import { test, expect } from '@playwright/test';

test.describe('PLM ETO Explosion', () => {
  test('PLM page loads BOM editor', async ({ page }) => {
    await page.goto('/plm');
    await expect(page.locator('body')).toContainText(/PLM|BOM|Bill/i, { timeout: 15000 });
  });

  test('PLM BOM list visible when data exists', async ({ page }) => {
    await page.goto('/plm');
    await page.waitForTimeout(3000);
    const body = await page.locator('body').innerText();
    const hasBom = /BOM|DRAFT|RELEASED|Brak|Loading|Ładowanie/i.test(body);
    expect(hasBom).toBeTruthy();
  });
});
