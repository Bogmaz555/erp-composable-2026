const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== Faza 8 Data Trust FINAL Smoke (W62) ===\n');
  let fails = 0;
  for (const path of [
    '/api/analytics/platform/data-integrity/readiness',
    '/api/analytics/platform/import/readiness',
  ]) {
    const res = await fetch(`${GW}${path}`, { signal: AbortSignal.timeout(15000) });
    const body = res.ok ? await res.json() : null;
    const ready = body && (body as { ready?: boolean }).ready;
    console.log(`✓ ${path.split('/').pop()} → ready=${ready}`);
    if (!res.ok || !ready) fails++;
  }
  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}
run();
