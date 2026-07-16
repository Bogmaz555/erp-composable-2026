/**
 * W58 — Extended domain depth FINAL (6 modules)
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

const CHECKS = [
  { name: 'PLM', path: '/api/analytics/platform/plm-domain/readiness' },
  { name: 'MES', path: '/api/analytics/platform/mes-domain/readiness' },
  { name: 'Finance', path: '/api/analytics/platform/finance-domain/readiness' },
  { name: 'Quality', path: '/api/analytics/platform/quality-domain/readiness' },
  { name: 'Procurement', path: '/api/analytics/platform/proc-domain/readiness' },
  { name: 'EAM', path: '/api/analytics/platform/eam-domain/readiness' },
];

async function run() {
  console.log('=== Extended Domain Depth FINAL Smoke (W58) ===\n');
  let fails = 0;
  for (const c of CHECKS) {
    const res = await fetch(`${GW}${c.path}`, { signal: AbortSignal.timeout(15000) });
    const body = res.ok ? await res.json() : null;
    const ready = body && typeof body === 'object' ? (body as { ready?: boolean }).ready : false;
    console.log(`✓ ${c.name} → ${res.ok ? 200 : 'FAIL'} ready=${ready}`);
    if (!res.ok || !ready) fails++;
  }
  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}
run();
