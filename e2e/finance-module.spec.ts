import { test, expect } from '@playwright/test';

test.describe('Finance Module (W92)', () => {
  test('finance page shows milestone billing', async ({ page }) => {
    await page.goto('/finance');
    await expect(page.locator('body')).toContainText(/Finanse|milestones|Środki/i, { timeout: 20000 });
  });
});
