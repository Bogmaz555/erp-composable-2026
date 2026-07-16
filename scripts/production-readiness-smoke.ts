/**
 * W40 — Production readiness aggregate smoke
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== Production Readiness Smoke (W40) ===\n');
  let fails = 0;

  const res = await fetch(`${GW}/api/analytics/platform/production/readiness`, {
    headers: { 'X-Tenant-Id': 'default' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    console.log(`✗ platform/production/readiness → ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log(`✓ ready=${body.ready} score=${body.score}% passed=${body.passed}/${body.total}`);
  for (const c of body.checks ?? []) {
    console.log(`  ${c.ok ? '✓' : '✗'} ${c.id} ${c.label} → ${c.status}`);
  }

  if (!body.ready) fails++;
  if (body.score < 65) fails++;

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
