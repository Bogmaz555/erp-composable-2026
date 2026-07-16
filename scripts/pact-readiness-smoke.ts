/**
 * W48 — Pact / Event Registry readiness smoke (TD-012 lite)
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== Pact Readiness Smoke (W48 / TD-012) ===\n');
  let fails = 0;
  const res = await fetch(`${GW}/api/analytics/platform/pact/readiness`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) {
    console.log(`✗ platform/pact/readiness → ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log(`✓ ready=${body.ready} td012=${body.td012} active=${body.activeEvents} domains=${body.domains}`);
  if (!body.ready) fails++;
  if (body.activeEvents < 15) fails++;
  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
