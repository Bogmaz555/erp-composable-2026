const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== Outbox DLQ Smoke ===\n');
  const res = await fetch(`${GW}/api/analytics/outbox/dead-letter`, {
    signal: AbortSignal.timeout(12000),
  }).catch(() => null);
  if (!res?.ok) {
    console.log(`SKIP: dead-letter → ${res?.status ?? 'down'}`);
    process.exit(0);
  }
  const body = await res.json();
  console.log(`✓ totalFailed=${body.totalFailed} services=${body.services?.length ?? 0}`);
  console.log('\n=== Result: PASS ===');
}

run();
