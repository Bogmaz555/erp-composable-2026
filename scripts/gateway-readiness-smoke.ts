/**
 * W42 — Gateway proxy readiness smoke (TD-002)
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== Gateway Readiness Smoke (W42 / TD-002) ===\n');
  let fails = 0;

  const res = await fetch(`${GW}/api/analytics/platform/gateway/readiness`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    console.log(`✗ platform/gateway/readiness → ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log(`✓ ready=${body.ready} td002=${body.td002} routes=${body.proxyRoutesUp}/${body.proxyRoutesTotal}`);

  if (!body.ready) fails++;
  if (!['yellow-minimum', 'partial'].includes(body.td002)) fails++;

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
