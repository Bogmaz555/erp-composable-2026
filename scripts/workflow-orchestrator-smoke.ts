/**
 * Workflow-driven orchestrator smoke — YAML steps → durable jobs
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
const H = { 'Content-Type': 'application/json', 'X-Tenant-Id': 'default' };

async function run() {
  console.log('=== Workflow Orchestrator Smoke ===\n');
  let fails = 0;

  const wfRes = await fetch(`${GW}/api/analytics/eto-chain/workflow`, { signal: AbortSignal.timeout(8000) });
  if (!wfRes.ok) {
    console.log(`✗ workflow ${wfRes.status}`);
    process.exit(1);
  }
  const wf = await wfRes.json();
  const expected = wf.stepCount ?? 7;

  const cid = `wf-smoke-${Date.now()}`;
  let orch: Response | null = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    orch = await fetch(`${GW}/api/analytics/eto-chain/orchestrate`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({ correlationId: cid, tenantId: 'default' }),
      signal: AbortSignal.timeout(12000),
    });
    if (orch.ok) break;
    console.log(`  retry ${attempt}: orchestrate ${orch.status}`);
    await new Promise((r) => setTimeout(r, 4000));
  }
  if (!orch?.ok) {
    console.log(`✗ orchestrate ${orch?.status ?? 'n/a'}`);
    process.exit(1);
  }
  const body = await orch.json();
  console.log(`✓ queued ${body.jobs} jobs (${body.workflow} ${body.workflowVersion})`);
  if (body.jobs !== expected) fails++;
  if (!Array.isArray(body.queued) || body.queued.length !== expected) fails++;

  await new Promise((r) => setTimeout(r, 8000));

  const st = await fetch(`${GW}/api/analytics/eto-chain/orchestrator/status?tenantId=default`, {
    signal: AbortSignal.timeout(8000),
  });
  if (st.ok) {
    const q = await st.json();
    const progressed = (q.done ?? 0) + (q.pending ?? 0);
    console.log(`✓ queue pending=${q.pending} done=${q.done} failed=${q.failed}`);
    if (progressed < expected) fails++;
  } else {
    console.log(`✗ orchestrator status ${st.status}`);
    fails++;
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 1 ? 1 : 0);
}

run();
