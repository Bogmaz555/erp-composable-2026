const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== SLO Burn Rate Readiness Smoke (W111) ===\n');
  const res = await fetch(`${GW}/api/analytics/platform/slo-burn-rate/readiness`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    console.log(`✗ ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log(`✓ ready=${body.ready} multiWindow=${body.multiWindowRules}`);
  process.exit(body.ready ? 0 : 1);
}
run();
