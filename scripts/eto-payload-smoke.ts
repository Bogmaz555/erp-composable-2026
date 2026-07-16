/**
 * W43 — ETO payload coverage smoke (TD-004)
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== ETO Payload Readiness Smoke (W43) ===\n');
  let fails = 0;

  const res = await fetch(`${GW}/api/analytics/platform/eto-payload/readiness`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    console.log(`✗ platform/eto-payload/readiness → ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log(`✓ ready=${body.ready} td004=${body.td004} guarded=${body.guarded}/${body.total}`);

  if (!body.ready) fails++;
  if (body.guarded < 3) fails++;

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
