const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== BI Scheduler Readiness Smoke (W75) ===\n');
  const res = await fetch(`${GW}/api/analytics/platform/bi-scheduler/readiness`, {
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    console.log(`✗ ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log(
    `✓ ready=${body.ready} lastRun=${body.lastRunAt} refreshed=${body.lastRefreshCount} mode=${body.persistenceMode}`,
  );
  process.exit(body.ready ? 0 : 1);
}
run();
