/**
 * NATS compensation smoke — compensate publishes to NATS + orchestrator queue
 * Run: npx tsx scripts/compensation-nats-smoke.ts
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== Compensation NATS Smoke ===\n');
  let fails = 0;

  const trigger = await fetch(`${GW}/api/analytics/eto-chain/trigger-demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': 'default' },
    body: '{}',
    signal: AbortSignal.timeout(30000),
  });
  if (!trigger.ok) {
    console.log(`✗ trigger-demo → ${trigger.status}`);
    process.exit(1);
  }
  const { correlationId } = await trigger.json();
  console.log(`✓ trigger-demo ${correlationId}`);

  const comp = await fetch(`${GW}/api/analytics/eto-chain/compensate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': 'default' },
    body: JSON.stringify({ correlationId }),
    signal: AbortSignal.timeout(20000),
  });
  if (!comp.ok) {
    console.log(`✗ compensate → ${comp.status}`);
    fails++;
  } else {
    const body = await comp.json();
    const published = body.natsPublished?.length ?? 0;
    console.log(`✓ compensate natsPublished=${published}`);
    if (published < 1) fails++;
  }

  const orch = await fetch(`${GW}/api/analytics/eto-chain/orchestrate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': 'default' },
    body: JSON.stringify({ correlationId: `nats-orch-${Date.now()}` }),
    signal: AbortSignal.timeout(10000),
  });
  if (orch.ok) {
    const ob = await orch.json();
    console.log(`✓ orchestrate queued ${ob.jobs} jobs`);
  } else {
    console.log(`✗ orchestrate → ${orch.status}`);
    fails++;
  }

  await new Promise((r) => setTimeout(r, 8000));

  const status = await fetch(`${GW}/api/analytics/eto-chain/orchestrator/status`, {
    signal: AbortSignal.timeout(8000),
  });
  if (status.ok) {
    const sb = await status.json();
    console.log(`✓ orchestrator pending=${sb.pending} done=${sb.done}`);
  } else {
    console.log(`✗ orchestrator status → ${status.status}`);
    fails++;
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
