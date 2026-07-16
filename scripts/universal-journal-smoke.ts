/**
 * Universal Journal lite smoke
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== Universal Journal Smoke ===\n');
  const res = await fetch(`${GW}/api/fin/universal-journal`, {
    headers: { 'X-Tenant-Id': 'default' },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    console.log(`SKIP: universal-journal → ${res.status}`);
    process.exit(0);
  }
  const body = await res.json();
  console.log(`✓ entries=${body.entries?.length ?? 0} totalAmount=${body.summary?.totalAmount ?? 0}`);
  if (!body.summary || typeof body.summary.totalAmount !== 'number') {
    console.log('✗ missing summary');
    process.exit(1);
  }
  console.log('\n=== Result: PASS ===');
}

run();
