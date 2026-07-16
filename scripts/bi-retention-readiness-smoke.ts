const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== BI Retention Readiness Smoke (W79) ===\n');
  const res = await fetch(`${GW}/api/analytics/platform/bi-retention/readiness`, {
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    console.log(`✗ ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log(
    `✓ ready=${body.ready} ttl=${body.ttlHours}h total=${body.snapshotTotal} purged=${body.lastPurgedCount}`,
  );
  process.exit(body.ready ? 0 : 1);
}
run();
