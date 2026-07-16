const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== mTLS Client Verify Readiness Smoke (W109) ===\n');
  const res = await fetch(`${GW}/api/analytics/platform/mtls-client-verify/readiness`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    console.log(`✗ ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log(`✓ ready=${body.ready} hook=${body.clientVerifyHook}`);
  process.exit(body.ready ? 0 : 1);
}
run();
