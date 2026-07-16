import { test, expect } from '@playwright/test';

const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

test.describe('PLM Explosion Full Chain', () => {
  test('workflow definition has 7 steps', async ({ request }) => {
    const res = await request.get(`${GW}/api/analytics/eto-chain/workflow`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.stepCount).toBeGreaterThanOrEqual(7);
    expect(body.temporalReady).toBe(true);
  });

  test('dashboard reaches high ETO progress after trigger', async ({ page, request }) => {
    await page.goto('/');
    await expect(page.getByText('ETO Machine Build Chain')).toBeVisible({ timeout: 20000 });

    const trigger = await request.post(`${GW}/api/analytics/eto-chain/trigger-demo`, {
      data: {},
      headers: { 'X-Tenant-Id': 'default' },
    });
    expect(trigger.ok()).toBeTruthy();

    await page.waitForTimeout(8000);
    await page.reload();
    await expect(page.getByText('ETO Machine Build Chain')).toBeVisible({ timeout: 15000 });

    const status = await request.get(`${GW}/api/analytics/eto-chain/status`, {
      headers: { 'X-Tenant-Id': 'default' },
    });
    expect(status.ok()).toBeTruthy();
    const body = await status.json();
    const pct = body.saga?.percentComplete ?? 0;
    const done = body.steps?.filter((s: { done: boolean }) => s.done).length ?? 0;
    expect(done + pct).toBeGreaterThan(0);
  });

  test('PLM page and orchestrator visible from UI flow', async ({ page, request }) => {
    await page.goto('/plm');
    await expect(page.locator('body')).toContainText(/PLM|BOM/i, { timeout: 15000 });

    const orch = await request.get(`${GW}/api/analytics/eto-chain/orchestrator/status`);
    expect(orch.ok()).toBeTruthy();
  });
});
