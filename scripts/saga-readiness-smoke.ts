/**
 * W29 — TD-003 saga readiness smoke (orchestrator + temporal + workflow)
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
const H = { 'X-Tenant-Id': 'default' };

async function run() {
  console.log('=== Saga Readiness Smoke (W29) ===\n');
  let fails = 0;

  const res = await fetch(`${GW}/api/analytics/eto-chain/saga/readiness`, {
    headers: H,
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) {
    console.log(`✗ saga/readiness → ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log(`✓ ready=${body.ready} td003=${body.td003}`);
  console.log(`  workflow=${body.workflow?.name} steps=${body.workflow?.stepCount}`);
  console.log(`  temporal.mode=${body.temporal?.mode}`);
  console.log(`  orchestrator.pending=${body.orchestrator?.pending}`);

  if (!body.workflow?.stepCount || body.workflow.stepCount < 7) fails++;
  if (!body.ready) fails++;
  if (body.td003 !== 'yellow-minimum') fails++;

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
