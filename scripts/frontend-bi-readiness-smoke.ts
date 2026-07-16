const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== Frontend BI Readiness Smoke (W71) ===\n');
  const res = await fetch(`${GW}/api/analytics/platform/frontend-bi/readiness`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    console.log(`✗ ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log(
    `✓ ready=${body.ready} action=${body.frontendActionWired} hook=${body.hookWired} gw=${body.gatewayDashboardOk}`,
  );
  process.exit(body.ready ? 0 : 1);
}
run();
