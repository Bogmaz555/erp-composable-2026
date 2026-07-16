const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== CI Auth Live Readiness Smoke (W81) ===\n');
  const res = await fetch(`${GW}/api/analytics/platform/ci-auth-live/readiness`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    console.log(`✗ ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log(
    `✓ ready=${body.ready} liveProbe=${body.liveProbeScript} wf=${body.workflowIncludesLive} gw=${body.liveGatewayReachable}`,
  );
  process.exit(body.ready ? 0 : 1);
}
run();
