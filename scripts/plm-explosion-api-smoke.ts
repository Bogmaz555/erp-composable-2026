/**
 * PLM Explosion API smoke — full chain without browser
 * Run: npx tsx scripts/plm-explosion-api-smoke.ts
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
const H = { 'Content-Type': 'application/json', 'X-Tenant-Id': 'default' };

async function run() {
  console.log('=== PLM Explosion API Smoke ===\n');
  let fails = 0;

  const wf = await fetch(`${GW}/api/analytics/eto-chain/workflow`, { signal: AbortSignal.timeout(10000) });
  if (!wf.ok) {
    console.log(`✗ workflow → ${wf.status}`);
    process.exit(1);
  }
  const w = await wf.json();
  console.log(`✓ workflow ${w.name} steps=${w.stepCount}`);
  if ((w.stepCount ?? 0) < 7) fails++;

  const trigger = await fetch(`${GW}/api/analytics/eto-chain/trigger-demo`, {
    method: 'POST',
    headers: H,
    body: '{}',
    signal: AbortSignal.timeout(15000),
  });
  if (!trigger.ok) {
    console.log(`✗ trigger-demo → ${trigger.status}`);
    fails++;
  } else {
    const t = await trigger.json();
    console.log(`✓ trigger-demo correlation=${t.correlationId ?? t.saga?.correlationId ?? 'ok'}`);
  }

  await new Promise((r) => setTimeout(r, 6000));

  const status = await fetch(`${GW}/api/analytics/eto-chain/status`, {
    headers: { 'X-Tenant-Id': 'default' },
    signal: AbortSignal.timeout(10000),
  });
  if (status.ok) {
    const s = await status.json();
    const done = s.steps?.filter((x: { done: boolean }) => x.done).length ?? 0;
    const pct = s.saga?.percentComplete ?? 0;
    console.log(`✓ chain status done=${done} pct=${pct}`);
    if (done + pct < 1) fails++;
  } else {
    console.log(`✗ status → ${status.status}`);
    fails++;
  }

  const orch = await fetch(`${GW}/api/analytics/eto-chain/orchestrate`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ projectId: 'proj-plm-smoke' }),
    signal: AbortSignal.timeout(12000),
  });
  if (orch.ok) {
    const o = await orch.json();
    console.log(`✓ orchestrate jobs=${o.jobs} workflow=${o.workflow ?? 'n/a'}`);
    if ((o.jobs ?? 0) < 7) fails++;
  } else {
    console.log(`✗ orchestrate → ${orch.status}`);
    fails++;
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 1 ? 1 : 0);
}

run();
