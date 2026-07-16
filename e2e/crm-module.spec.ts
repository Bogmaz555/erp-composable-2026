import { test, expect } from '@playwright/test';

test.describe('CRM Module (W104)', () => {
  test('crm cpq page loads', async ({ page }) => {
    await page.goto('/crm');
    await expect(page.locator('body')).toContainText(/CRM|CPQ|Pipeline/i, { timeout: 20000 });
  });
});
