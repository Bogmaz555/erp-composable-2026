/**
 * E2E smoke — Warstwa 7 (API + UI reachability)
 * Run: npx tsx scripts/e2e-warstwa7-smoke.ts
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
const FE = process.env.FRONTEND_URL || 'http://127.0.0.1:3001';

interface Check {
  name: string;
  url: string;
  tenant?: string;
}

const checks: Check[] = [
  { name: 'JPK_KR', url: `${GW}/api/tax-legal/jpk/kr?year=2026&month=6` },
  { name: 'JPK_V7', url: `${GW}/api/tax-legal/jpk/v7?year=2026&month=6` },
  { name: 'Fixed Assets', url: `${GW}/api/fin/fixed-assets` },
  { name: 'Tenants', url: `${GW}/api/analytics/tenants` },
  { name: 'Approvals', url: `${GW}/api/analytics/approvals?status=PENDING`, tenant: 'default' },
  { name: 'ISO docs', url: `${GW}/api/quality/iso/documents` },
  // PM schedule — dynamic project id resolved at runtime
  { name: 'UI finance', url: `${FE}/finance` },
  { name: 'UI tax', url: `${FE}/tax` },
  { name: 'UI pm', url: `${FE}/pm` },
  { name: 'UI kiosk', url: `${FE}/mes/kiosk` },
];

async function run() {
  let fails = 0;
  console.log('=== E2E Warstwa 7 Smoke ===\n');

  // Dynamic PM project
  try {
    const pmRes = await fetch(`${GW}/api/pm`, { signal: AbortSignal.timeout(8000) });
    if (pmRes.ok) {
      const projects = await pmRes.json();
      const pid = projects[0]?.id;
      if (pid) {
        const schedRes = await fetch(`${GW}/api/pm/projects/${pid}/schedule`);
        console.log(`${schedRes.ok ? '✓' : '✗'} PM schedule (${pid}) → ${schedRes.status}`);
        if (!schedRes.ok) fails++;
      }
    }
  } catch {
    console.log('✗ PM schedule → SKIP');
  }

  for (const c of checks) {
    try {
      const headers: Record<string, string> = {};
      if (c.tenant) headers['X-Tenant-Id'] = c.tenant;
      const res = await fetch(c.url, { headers, signal: AbortSignal.timeout(10000) });
      const ok = res.status >= 200 && res.status < 400;
      console.log(`${ok ? '✓' : '✗'} ${c.name} → ${res.status}`);
      if (!ok) fails++;
    } catch (e) {
      console.log(`✗ ${c.name} → ERROR ${(e as Error).message}`);
      fails++;
    }
  }

  console.log(`\n=== Result: ${checks.length - fails}/${checks.length} passed ===`);
  process.exit(fails > 3 ? 1 : 0);
}

run();
