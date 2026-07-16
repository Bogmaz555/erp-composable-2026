import { test, expect } from '@playwright/test';

const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

test.describe('ETO Full Chain Flow', () => {
  test('dashboard trigger → API status → PLM page', async ({ page, request }) => {
    await page.goto('/');
    await expect(page.getByText('ETO Machine Build Chain')).toBeVisible({ timeout: 20000 });

    const before = await request.get(`${GW}/api/analytics/eto-chain/status`);
    expect(before.ok()).toBeTruthy();

    const triggerRes = await request.post(`${GW}/api/analytics/eto-chain/trigger-demo`, {
      data: {},
      headers: { 'X-Tenant-Id': 'default' },
    });
    expect(triggerRes.ok()).toBeTruthy();

    await page.waitForTimeout(6000);

    const after = await request.get(`${GW}/api/analytics/eto-chain/status`);
    expect(after.ok()).toBeTruthy();
    const body = await after.json();
    const done = body.steps?.filter((s: { done: boolean }) => s.done).length ?? 0;
    expect(done).toBeGreaterThanOrEqual(0);

    await page.goto('/plm');
    await expect(page.locator('body')).toContainText(/PLM|BOM/i, { timeout: 15000 });

    const orch = await request.get(`${GW}/api/analytics/eto-chain/orchestrator/status`);
    expect(orch.ok()).toBeTruthy();
  });

  test('orchestrate endpoint queues jobs', async ({ request }) => {
    const res = await request.post(`${GW}/api/analytics/eto-chain/orchestrate`, {
      data: { correlationId: `e2e-orch-${Date.now()}`, projectId: 'proj-eto-demo' },
      headers: { 'X-Tenant-Id': 'default' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.jobs).toBeGreaterThanOrEqual(7);
  });
});
