import { test, expect } from '@playwright/test';

const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

test.describe('ETO Dashboard Chain', () => {
  test('dashboard shows ETO chain panel', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('ETO Machine Build Chain')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Uruchom demo chain/i })).toBeVisible();
  });

  test('trigger demo chain increases progress', async ({ page, request }) => {
    await page.goto('/');
    const btn = page.getByRole('button', { name: /Uruchom demo chain/i });
    await expect(btn).toBeVisible({ timeout: 15000 });

    const before = await request.get(`${GW}/api/analytics/eto-chain/status`);
    expect(before.ok()).toBeTruthy();

    await btn.click();
    await page.waitForTimeout(8000);

    const statusRes = await request.get(`${GW}/api/analytics/eto-chain/status`);
    expect(statusRes.ok()).toBeTruthy();
    const body = await statusRes.json();
    const done = body.steps?.filter((s: { done: boolean }) => s.done).length ?? 0;
    expect(done).toBeGreaterThan(0);

    await expect(page.locator('.glass-panel').filter({ hasText: 'ETO Machine Build Chain' })).toBeVisible();
  });

  test('eto-chain history endpoint returns store', async ({ request }) => {
    const res = await request.get(`${GW}/api/analytics/eto-chain/history`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(['postgres', 'json']).toContain(body.store);
  });
});
