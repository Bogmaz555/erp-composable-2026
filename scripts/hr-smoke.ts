/**
 * HR smoke — DB connection + employees list via gateway
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
const HR = 'http://127.0.0.1:4012';

async function run() {
  console.log('=== HR Smoke ===\n');
  let fails = 0;

  const health = await fetch(`${HR}/hr/health`, { signal: AbortSignal.timeout(8000) });
  if (!health.ok) {
    console.log(`✗ hr/health → ${health.status}`);
    process.exit(1);
  }
  console.log('✓ hr/health OK');

  const gw = await fetch(`${GW}/api/hr/employees`, { signal: AbortSignal.timeout(10000) });
  if (!gw.ok) {
    console.log(`✗ GW /api/hr/employees → ${gw.status}`);
    fails++;
  } else {
    const list = await gw.json();
    console.log(`✓ GW employees count=${Array.isArray(list) ? list.length : '?'}`);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
