const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== Playwright Required Readiness Smoke (W88) ===\n');
  const res = await fetch(`${GW}/api/analytics/platform/playwright-required/readiness`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    console.log(`✗ ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log(`✓ ready=${body.ready} required=${body.workflowNoContinueOnError} gate=${body.ciGateIncludesProbe}`);
  process.exit(body.ready ? 0 : 1);
}
run();
