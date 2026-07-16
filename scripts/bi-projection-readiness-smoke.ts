const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== BI Projection Readiness Smoke (W73) ===\n');
  const res = await fetch(`${GW}/api/analytics/platform/bi-projection/readiness`, {
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    console.log(`✗ ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log(
    `✓ ready=${body.ready} mode=${body.persistenceMode} snapshot=${body.snapshotMaterialized} project=${body.sampleProjectId}`,
  );
  process.exit(body.ready ? 0 : 1);
}
run();
