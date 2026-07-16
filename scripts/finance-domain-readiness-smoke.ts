/**
 * W53 — Finance domain depth smoke (WIP breakdown)
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== Finance Domain Readiness Smoke (W53) ===\n');
  let fails = 0;

  const res = await fetch(`${GW}/api/analytics/platform/finance-domain/readiness`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    console.log(`✗ platform/finance-domain/readiness → ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log(
    `✓ ready=${body.ready} breakdown=${body.breakdownUp} project=${body.sampleProjectId ?? 'n/a'}`,
  );

  if (!body.ready) fails++;
  if (!body.breakdownUp) fails++;

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
