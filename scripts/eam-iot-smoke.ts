/**
 * W31 — EAM IoT lite smoke (status + breakdown persist + recent list)
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== EAM IoT Smoke (W31) ===\n');
  let fails = 0;

  const statusRes = await fetch(`${GW}/api/eam/iot/status`, { signal: AbortSignal.timeout(10000) });
  if (!statusRes.ok) {
    console.log(`✗ iot/status → ${statusRes.status}`);
    process.exit(1);
  }
  const status = await statusRes.json();
  console.log(`✓ iotEnabled=${status.iotEnabled} total=${status.equipmentTotal} broken=${status.brokenCount}`);

  const eqRes = await fetch(`${GW}/api/eam/equipment`, { signal: AbortSignal.timeout(8000) });
  let equipmentId = 'eq-smoke-iot';
  if (eqRes.ok) {
    const list = await eqRes.json();
    if (list[0]?.id) equipmentId = list[0].id;
  }

  const bd = await fetch(`${GW}/api/eam/breakdown`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      equipmentId,
      reason: 'W31 smoke — vibration anomaly',
      severity: 'HIGH',
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!bd.ok) {
    console.log(`✗ breakdown POST → ${bd.status}`);
    fails++;
  } else {
    console.log(`✓ breakdown reported for ${equipmentId}`);
  }

  const recent = await fetch(`${GW}/api/eam/breakdowns/recent?take=5`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!recent.ok) {
    console.log(`✗ breakdowns/recent → ${recent.status}`);
    fails++;
  } else {
    const r = await recent.json();
    console.log(`✓ recent breakdowns count=${r.count}`);
    if (r.count < 1) fails++;
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
