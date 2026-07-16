/**
 * W38 — Boot dev stack readiness smoke (TD-011)
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== Boot Readiness Smoke (W38 / TD-011) ===\n');
  let fails = 0;

  const res = await fetch(`${GW}/api/analytics/platform/boot/readiness`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    console.log(`✗ platform/boot/readiness → ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log(`✓ ready=${body.ready} td011=${body.td011} up=${body.servicesUp}/${body.servicesTotal} fePort=${body.frontendPort}`);

  if (!body.ready) fails++;
  if (!['yellow-minimum', 'partial'].includes(body.td011)) fails++;

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
