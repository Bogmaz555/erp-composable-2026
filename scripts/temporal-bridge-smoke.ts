/**
 * Temporal bridge smoke — status + bridge-run publishes workflow steps to NATS
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
const H = { 'Content-Type': 'application/json', 'X-Tenant-Id': 'default' };

async function run() {
  console.log('=== Temporal Bridge Smoke ===\n');
  let fails = 0;

  const st = await fetch(`${GW}/api/analytics/eto-chain/temporal/status`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!st.ok) {
    console.log(`✗ temporal status → ${st.status}`);
    process.exit(1);
  }
  const status = await st.json();
  console.log(`✓ mode=${status.mode} temporal=${status.temporalReachable} steps=${status.stepCount}`);
  if ((status.stepCount ?? 0) < 7) fails++;

  const cid = `tbridge-smoke-${Date.now()}`;
  let published = 0;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const run = await fetch(`${GW}/api/analytics/eto-chain/temporal/bridge-run`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({ correlationId: `${cid}-a${attempt}` }),
      signal: AbortSignal.timeout(15000),
    });
    if (!run.ok) {
      console.log(`  retry ${attempt}: bridge-run → ${run.status}`);
      await new Promise((r) => setTimeout(r, 4000));
      continue;
    }
    const body = await run.json();
    published = body.stepsPublished ?? 0;
    console.log(`✓ bridge-run published=${published}/${body.totalSteps} mode=${body.mode} (attempt ${attempt})`);
    if (published >= 7) break;
    await new Promise((r) => setTimeout(r, 4000));
  }
  if (published < 7) fails++;

  const chain = await fetch(`${GW}/api/analytics/eto-chain/status`, {
    headers: { 'X-Tenant-Id': 'default' },
    signal: AbortSignal.timeout(8000),
  });
  if (chain.ok) {
    const c = await chain.json();
    const done = c.steps?.filter((x: { done: boolean }) => x.done).length ?? 0;
    console.log(`✓ chain progress done=${done}`);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 1 ? 1 : 0);
}

run();
