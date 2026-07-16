import { test, expect } from '@playwright/test';

test.describe('MES → EAM → CRM chain (W120)', () => {
  test('cross-module navigation chain', async ({ page }) => {
    await page.goto('/mes');
    await expect(page.locator('body')).toContainText(/Kiosk|MES|Shopfloor/i, { timeout: 20000 });

    await page.goto('/eam');
    await expect(page.locator('body')).toContainText(/EAM|Work Orders|Harmonogram/i, { timeout: 20000 });

    await page.goto('/crm');
    await expect(page.locator('body')).toContainText(/CRM|CPQ|Pipeline/i, { timeout: 20000 });
  });
});
