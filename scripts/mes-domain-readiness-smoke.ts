/**
 * W52 — MES domain depth smoke (routing aggregate)
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== MES Domain Readiness Smoke (W52) ===\n');
  let fails = 0;

  const res = await fetch(`${GW}/api/analytics/platform/mes-domain/readiness`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    console.log(`✗ platform/mes-domain/readiness → ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log(
    `✓ ready=${body.ready} routing=${body.routingUp} wc=${body.workCenterCount} ops=${body.totalOperations}`,
  );

  if (!body.ready) fails++;
  if (!body.routingUp) fails++;

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
