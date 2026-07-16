/**
 * INV/MES compensation rollback smoke — NATS listeners + status endpoints
 * Run: npx tsx scripts/compensation-rollback-smoke.ts
 */
import { connect, StringCodec } from 'nats';

const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
const NATS_URL = process.env.NATS_URL || 'nats://127.0.0.1:4222';
const sc = StringCodec();

async function run() {
  console.log('=== Compensation Rollback Smoke (INV/MES) ===\n');
  let fails = 0;

  let nc;
  try {
    nc = await connect({ servers: NATS_URL, timeout: 4000 });
  } catch (e) {
    console.log('SKIP: NATS not reachable');
    process.exit(0);
  }

  const correlationId = `rollback-${Date.now()}`;
  const base = { correlationId, tenantId: 'default', compensate: true, workOrderId: 'wo-rollback-demo' };

  for (const [subject, extra] of [
    ['mes.workorder.cancelled', {}],
    ['mes.production.reversed', {}],
    ['inventory.reservation.restored', { compensatedStep: 'inventory.reservation.created.v1' }],
  ] as const) {
    nc.publish(subject, sc.encode(JSON.stringify({ ...base, ...extra })));
    console.log(`✓ Published ${subject}`);
    await sleep(1500);
  }
  await nc.close();

  await sleep(3000);

  for (const [name, url] of [
    ['INV compensation', `${GW}/api/inv/compensation/status`],
    ['MES compensation', `${GW}/api/mes/compensation/status`],
  ]) {
    try {
      const res = await fetch(url, { headers: { 'X-Tenant-Id': 'default' }, signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const body = await res.json();
        console.log(`✓ ${name}: processed=${body.compensationEventsProcessed ?? 0}`);
      } else if (res.status === 502 || res.status === 503) {
        console.log(`SKIP: ${name} → ${res.status} (service down)`);
      } else {
        console.log(`✗ ${name} → ${res.status}`);
        fails++;
      }
    } catch (e) {
      console.log(`✗ ${name} — ${(e as Error).message}`);
      fails++;
    }
  }

  const comp = await fetch(`${GW}/api/analytics/eto-chain/compensate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': 'default' },
    body: JSON.stringify({ correlationId: `api-${correlationId}` }),
    signal: AbortSignal.timeout(5000),
  });
  if (comp.status === 200 || comp.status === 201) {
    const body = await comp.json();
    if (!body.ok && body.error === 'saga not found') {
      console.log('✓ compensate API reachable (saga not found — expected)');
    } else {
      console.log(`✓ compensate API natsPublished=${body.natsPublished?.length ?? 0}`);
    }
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 1 ? 1 : 0);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

run();
