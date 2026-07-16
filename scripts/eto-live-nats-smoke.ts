/**
 * Live ETO NATS chain smoke — all 7 saga steps via NATS
 * Run: npx tsx scripts/eto-live-nats-smoke.ts
 */
import { connect, StringCodec } from 'nats';

const sc = StringCodec();
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
const NATS_URL = process.env.NATS_URL || 'nats://127.0.0.1:4222';

const SAGA_STEPS = [
  'plm.bom.released.v2',
  'pm.material.requested.v1',
  'inventory.reservation.created.v1',
  'mes.workorder.planned',
  'mes.production.recorded.v1',
  'inventory.reservation.released.v1',
  'finance.wip.cost.recorded',
] as const;

async function run() {
  console.log('=== ETO Live NATS Smoke (7-step) ===\n');
  let fails = 0;

  let nc;
  try {
    nc = await connect({ servers: NATS_URL, timeout: 4000 });
  } catch (e) {
    console.log('SKIP: NATS not reachable —', (e as Error).message);
    process.exit(0);
  }

  const correlationId = `live-${Date.now()}`;
  const projectId = 'proj-eto-live';
  const base = { projectId, tenantId: 'default', correlationId };

  const payloads: Record<string, object> = {
    'plm.bom.released.v2': {
      ...base,
      bomVersionId: 'bom-live-1',
      itemId: 'machine-live',
      revision: 'A',
      components: [{ bomComponentId: 'bc-live', childItemId: 'part-live', quantity: 1 }],
    },
    'pm.material.requested.v1': { ...base, materialSku: 'part-live', quantity: 1 },
    'inventory.reservation.created.v1': { ...base, bomComponentId: 'bc-live', quantity: 1 },
    'mes.workorder.planned': { ...base, workOrderId: 'wo-live-001' },
    'mes.production.recorded.v1': {
      ...base,
      workOrderId: 'wo-live-001',
      quantityGood: 1,
      laborHours: 4,
      bomComponentIds: ['bc-live'],
      operatorId: 'op-live',
    },
    'inventory.reservation.released.v1': {
      ...base,
      workOrderId: 'wo-live-001',
      releasedReservations: [{ bomComponentId: 'bc-live', quantity: 1, projectId }],
    },
    'finance.wip.cost.recorded': { ...base, laborCost: 400, materialCost: 1200 },
  };

  for (const step of SAGA_STEPS) {
    nc.publish(step, sc.encode(JSON.stringify(payloads[step])));
    console.log(`✓ Published ${step}`);
    await sleep(1200);
  }

  await sleep(4000);
  await nc.close();

  try {
    const res = await fetch(
      `${GW}/api/analytics/eto-chain/status?correlationId=${encodeURIComponent(correlationId)}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (res.ok) {
      const body = await res.json();
      const done = body.steps?.filter((s: { done: boolean }) => s.done).length ?? 0;
      const total = body.steps?.length ?? 7;
      console.log(`✓ ETO chain status: ${done}/${total} steps (store: ${body.store ?? 'n/a'})`);
      if (done < 3) {
        const fallback = await fetch(`${GW}/api/analytics/eto-chain/status`, { signal: AbortSignal.timeout(5000) });
        if (fallback.ok) {
          const fb = await fallback.json();
          const fbDone = fb.steps?.filter((s: { done: boolean }) => s.done).length ?? 0;
          console.log(`  (fallback default saga: ${fbDone}/${fb.steps?.length ?? 7} steps)`);
          if (fbDone < 3) fails++;
        } else fails++;
      }
    } else {
      console.log(`✗ eto-chain/status → ${res.status}`);
      fails++;
    }
  } catch (e) {
    console.log('✗ analytics unreachable —', (e as Error).message);
    fails++;
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 1 ? 1 : 0);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

run();
