const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== CI Auth Enforce Prod Readiness Smoke (W93) ===\n');
  const res = await fetch(`${GW}/api/analytics/platform/ci-auth-enforce-prod/readiness`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    console.log(`✗ ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log(`✓ ready=${body.ready} live=${body.authLiveNoContinueOnError} prod=${body.workflowIncludesProdProbe}`);
  process.exit(body.ready ? 0 : 1);
}
run();
