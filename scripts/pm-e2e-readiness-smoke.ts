const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== PM E2E Readiness Smoke (W76) ===\n');
  const res = await fetch(`${GW}/api/analytics/platform/pm-e2e/readiness`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    console.log(`✗ ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log(`✓ ready=${body.ready} spec=${body.specExists} bi=${body.specCoversBi}`);
  process.exit(body.ready ? 0 : 1);
}
run();
