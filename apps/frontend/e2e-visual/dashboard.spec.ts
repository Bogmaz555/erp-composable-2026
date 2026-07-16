import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests - Baseline', () => {
  test('Kiosk MES Dashboard', async ({ page }) => {
    // Navigate to the MES Kiosk
    await page.goto('/mes/kiosk');
    
    // Wait for the page to load and stabilize
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot and compare against baseline
    await expect(page).toHaveScreenshot('kiosk-mes-dashboard.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05 // 5% tolerancji na drobne różnice renderowania
    });
  });

  test('Main ERP Dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('erp-dashboard.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05
    });
  });
});
