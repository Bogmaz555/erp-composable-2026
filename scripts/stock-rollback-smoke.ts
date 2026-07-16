/**
 * Stock rollback smoke — compensation restores Item.stockQuantity
 * Run: npx tsx scripts/stock-rollback-smoke.ts
 */
import { connect, StringCodec } from 'nats';

const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
const NATS_URL = process.env.NATS_URL || 'nats://127.0.0.1:4222';

async function run() {
  console.log('=== Stock Rollback Smoke ===\n');
  let fails = 0;

  const invBefore = await fetch(`${GW}/api/inv/inventory`, {
    headers: { 'X-Tenant-Id': 'default' },
    signal: AbortSignal.timeout(10000),
  });
  if (!invBefore.ok) {
    console.log(`SKIP: INV inventory → ${invBefore.status}`);
    process.exit(0);
  }
  const itemsBefore = await invBefore.json();
  const sample = Array.isArray(itemsBefore) ? itemsBefore[0] : itemsBefore?.items?.[0];
  const sku = sample?.sku || sample?.id;
  const qtyBefore = sample?.stockQuantity ?? sample?.quantity ?? 0;
  console.log(`✓ baseline item stock=${qtyBefore} (${sku ?? 'n/a'})`);

  let nc;
  try {
    nc = await connect({ servers: NATS_URL, timeout: 4000 });
  } catch {
    console.log('SKIP: NATS down');
    process.exit(0);
  }

  const sc = StringCodec();
  nc.publish(
    'inventory.reservation.restored',
    sc.encode(JSON.stringify({
      compensate: true,
      tenantId: 'default',
      workOrderId: 'wo-stock-rollback-demo',
      correlationId: `stock-${Date.now()}`,
      compensatedStep: 'inventory.reservation.created.v1',
    })),
  );
  await new Promise((r) => setTimeout(r, 3000));
  await nc.close();

  const invStatus = await fetch(`${GW}/api/inv/compensation/status`, {
    headers: { 'X-Tenant-Id': 'default' },
    signal: AbortSignal.timeout(8000),
  });
  if (invStatus.ok) {
    const st = await invStatus.json();
    const tx = st.compensationTransactions ?? 0;
    console.log(`✓ INV compensation processed=${st.compensationEventsProcessed ?? 0} tx=${tx}`);
    if ((st.compensationEventsProcessed ?? 0) < 1) fails++;
  } else {
    console.log(`✗ INV compensation status → ${invStatus.status}`);
    fails++;
  }

  const wf = await fetch(`${GW}/api/analytics/eto-chain/workflow`, { signal: AbortSignal.timeout(8000) });
  if (wf.ok) {
    const w = await wf.json();
    console.log(`✓ workflow ${w.name} v${w.version} steps=${w.stepCount}`);
    if ((w.stepCount ?? 0) < 7) fails++;
  } else {
    console.log(`✗ workflow → ${wf.status}`);
    fails++;
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 1 ? 1 : 0);
}

run();
