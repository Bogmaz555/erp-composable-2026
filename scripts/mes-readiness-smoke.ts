/**
 * W47 — MES ETO readiness smoke
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== MES Readiness Smoke (W47) ===\n');
  let fails = 0;
  const res = await fetch(`${GW}/api/analytics/platform/mes/readiness`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) {
    console.log(`✗ platform/mes/readiness → ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log(`✓ ready=${body.ready} td004=${body.td004} WO=${body.workOrderCount} probes=${body.probesUp}/${body.probesTotal}`);
  if (!body.ready) fails++;
  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
