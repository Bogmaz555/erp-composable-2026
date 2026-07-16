/**
 * W44 — Full stack readiness smoke (TD-011 extension)
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== Stack Readiness Smoke (W44 / TD-011) ===\n');
  let fails = 0;

  const res = await fetch(`${GW}/api/analytics/platform/stack/readiness`, {
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    console.log(`✗ platform/stack/readiness → ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log(
    `✓ ready=${body.ready} td011=${body.td011} up=${body.servicesUp}/${body.servicesTotal} mfg=${body.manufacturingUp}/${body.manufacturingTotal}`,
  );

  if (!body.ready) fails++;
  if (!['yellow-minimum', 'partial'].includes(body.td011)) fails++;
  if (body.manufacturingUp < 4) fails++;

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
