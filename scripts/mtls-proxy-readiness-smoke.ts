const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== mTLS Proxy Readiness Smoke (W105) ===\n');
  const res = await fetch(`${GW}/api/analytics/platform/mtls-proxy/readiness`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    console.log(`✗ ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log(`✓ ready=${body.ready} hook=${body.proxyHook} wf=${body.workflowIncludesProbe}`);
  process.exit(body.ready ? 0 : 1);
}
run();
