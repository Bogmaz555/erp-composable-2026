const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== CI Auth Readiness Smoke (W68) ===\n');
  const res = await fetch(`${GW}/api/analytics/platform/ci-auth/readiness`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    console.log(`✗ ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log(
    `✓ ready=${body.ready} ciGate=${body.ciGateScript} bootAuth=${body.bootAllAuthScript} authEnf=${body.authEnforcementReady}`,
  );
  process.exit(body.ready ? 0 : 1);
}
run();
