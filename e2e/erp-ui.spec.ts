import { test, expect } from '@playwright/test';

const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

test.describe('ERP UI Navigation', () => {
  test('dashboard loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toContainText(/ERP|Zarząd|BI/i);
  });

  test('finance page loads', async ({ page }) => {
    await page.goto('/finance');
    await expect(page.locator('body')).toContainText(/Finanse|milestones|Środki/i);
  });

  test('tax page with JPK panels', async ({ page }) => {
    await page.goto('/tax');
    await expect(page.locator('body')).toContainText(/JPK|KSeF|Tax/i);
  });

  test('quality page with ISO', async ({ page }) => {
    await page.goto('/quality');
    await expect(page.locator('body')).toContainText(/Quality|ISO|SPC/i);
  });

  test('mes kiosk touch UI', async ({ page }) => {
    await page.goto('/mes/kiosk');
    await expect(page.locator('body')).toContainText(/Kiosk|START|MES/i);
  });

  test('settings roles page', async ({ page }) => {
    await page.goto('/settings/roles');
    await expect(page.locator('body')).toContainText(/Role|uprawnienia|ADMIN/i);
  });
});

test.describe('ERP API Gateway', () => {
  test('tenants endpoint', async ({ request }) => {
    const res = await request.get(`${GW}/api/analytics/tenants`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.tenants?.length).toBeGreaterThan(0);
  });

  test('mail outbox endpoint', async ({ request }) => {
    const res = await request.get(`${GW}/api/analytics/mail/outbox`);
    expect(res.ok()).toBeTruthy();
  });

  test('jpk kr endpoint', async ({ request }) => {
    const res = await request.get(`${GW}/api/tax-legal/jpk/kr?year=2026&month=6`);
    expect(res.ok()).toBeTruthy();
  });

  test('jpk kr validate endpoint', async ({ request }) => {
    const res = await request.get(`${GW}/api/tax-legal/jpk/kr/validate?year=2026&month=6`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('valid');
  });

  test('command center endpoint', async ({ request }) => {
    const res = await request.get(`${GW}/api/analytics/command-center`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.summary?.healthScore).toBeGreaterThanOrEqual(0);
  });

  test('proc orders tenant-scoped', async ({ request }) => {
    const res = await request.get(`${GW}/api/proc/orders`, {
      headers: { 'X-Tenant-Id': 'default' },
    });
    expect(res.status()).toBeLessThan(500);
  });
});
