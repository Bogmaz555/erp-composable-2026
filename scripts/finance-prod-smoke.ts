/**
 * W33 — Finance prod smoke (ensure-finance-prod + GW routes)
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
const FIN = 'http://127.0.0.1:4010';

async function run() {
  console.log('=== Finance Prod Smoke (W33) ===\n');
  let fails = 0;

  const health = await fetch(`${FIN}/fin/health`, { signal: AbortSignal.timeout(8000) });
  if (!health.ok) {
    console.log(`✗ fin/health direct → ${health.status}`);
    fails++;
  } else {
    console.log('✓ fin/health direct OK');
  }

  for (const [name, url] of [
    ['Journal GW', `${GW}/api/fin/journal`],
    ['Fixed Assets GW', `${GW}/api/fin/fixed-assets`],
    ['Universal journal', `${GW}/api/fin/universal-journal`],
  ]) {
    const res = await fetch(url, {
      headers: { 'X-Tenant-Id': 'default' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.log(`✗ ${name} → ${res.status}`);
      fails++;
    } else {
      console.log(`✓ ${name} → ${res.status}`);
    }
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
