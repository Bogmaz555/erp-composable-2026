/**
 * W45 — Tax-Legal / KSeF / JPK readiness smoke (TD-005)
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== Tax Readiness Smoke (W45 / TD-005) ===\n');
  let fails = 0;

  const res = await fetch(`${GW}/api/analytics/platform/tax/readiness`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    console.log(`✗ platform/tax/readiness → ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log(
    `✓ ready=${body.ready} td005=${body.td005} probes=${body.probesUp}/${body.probesTotal} ksef=${body.ksefMode} jpk=${body.jpkReady}`,
  );

  if (!body.ready) fails++;
  if (!['yellow-minimum', 'partial'].includes(body.td005)) fails++;
  if (!body.jpkReady) fails++;

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
