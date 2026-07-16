import { test, expect } from '@playwright/test';

test.describe('PM → Finance → Tax chain (W112)', () => {
  test('cross-module navigation chain', async ({ page }) => {
    await page.goto('/pm');
    await expect(page.locator('body')).toContainText(/Projekt|PM|Rejestr/i, { timeout: 20000 });

    await page.goto('/finance');
    await expect(page.locator('body')).toContainText(/Finanse|milestones|Środki/i, { timeout: 20000 });

    await page.goto('/tax');
    await expect(page.locator('body')).toContainText(/Tax|KSeF|JPK/i, { timeout: 20000 });
  });
});
