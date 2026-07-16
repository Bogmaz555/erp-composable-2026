const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== EAM Domain Readiness Smoke (W57) ===\n');
  const res = await fetch(`${GW}/api/analytics/platform/eam-domain/readiness`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) { console.log(`✗ ${res.status}`); process.exit(1); }
  const body = await res.json();
  console.log(`✓ ready=${body.ready} maintAgg=${body.maintenanceAggregateUp} equip=${body.equipmentCount}`);
  process.exit(body.ready && body.maintenanceAggregateUp ? 0 : 1);
}
run();
