const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== Playwright CI Readiness Smoke (W80) ===\n');
  const res = await fetch(`${GW}/api/analytics/platform/playwright-ci/readiness`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    console.log(`✗ ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log(`✓ ready=${body.ready} spec=${body.specExists} wf=${body.workflowIncludesPmBi} gate=${body.ciGateIncludesProbe}`);
  process.exit(body.ready ? 0 : 1);
}
run();
