const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== Quality Domain Readiness Smoke (W55) ===\n');
  const res = await fetch(`${GW}/api/analytics/platform/quality-domain/readiness`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) { console.log(`✗ ${res.status}`); process.exit(1); }
  const body = await res.json();
  console.log(`✓ ready=${body.ready} capaAgg=${body.capaAggregateUp} ncrs=${body.ncrCount}`);
  process.exit(body.ready && body.capaAggregateUp ? 0 : 1);
}
run();
