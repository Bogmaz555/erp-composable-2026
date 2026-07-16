/**
 * W34 — Observability readiness smoke (OTel + Outbox DLQ + Jaeger)
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== Observability Readiness Smoke (W34) ===\n');
  let fails = 0;

  const res = await fetch(`${GW}/api/analytics/platform/observability/readiness`, {
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) {
    console.log(`✗ observability/readiness → ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log(`✓ ready=${body.ready} td008=${body.td008} td009=${body.td009} jaeger=${body.jaegerUiUp}`);

  if (!body.ready) fails++;
  if (body.td008 !== 'yellow-minimum') fails++;
  if (body.td009 !== 'yellow-minimum') fails++;

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
