import { test, expect } from '@playwright/test';

test.describe('Visual regression baseline (W132)', () => {
  test('home page snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('home.png', { maxDiffPixelRatio: 0.05 });
  });

  test('finance page snapshot', async ({ page }) => {
    await page.goto('/finance');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('finance.png', { maxDiffPixelRatio: 0.05 });
  });

  test('pm page snapshot', async ({ page }) => {
    await page.goto('/pm');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('pm.png', { maxDiffPixelRatio: 0.05 });
  });
});
