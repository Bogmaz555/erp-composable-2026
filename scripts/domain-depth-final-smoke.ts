/**
 * W54 — Faza 6 domain depth FINAL smoke (PLM + MES + Finance)
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function probe(path: string) {
  const res = await fetch(`${GW}${path}`, { signal: AbortSignal.timeout(15000) });
  return { ok: res.ok, body: res.ok ? await res.json() : null };
}

async function run() {
  console.log('=== Domain Depth FINAL Smoke (W54) ===\n');
  let fails = 0;

  const checks = [
    { name: 'PLM domain', path: '/api/analytics/platform/plm-domain/readiness' },
    { name: 'MES domain', path: '/api/analytics/platform/mes-domain/readiness' },
    { name: 'Finance domain', path: '/api/analytics/platform/finance-domain/readiness' },
  ];

  for (const c of checks) {
    const { ok, body } = await probe(c.path);
    const ready = body && typeof body === 'object' ? (body as { ready?: boolean }).ready : false;
    console.log(`✓ ${c.name} → ${ok ? '200' : 'FAIL'} ready=${ready}`);
    if (!ok || !ready) fails++;
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
