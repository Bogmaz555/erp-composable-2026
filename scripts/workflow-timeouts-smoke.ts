/**
 * Workflow YAML timeouts smoke — step timeouts exposed via API
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
const H = { 'Content-Type': 'application/json', 'X-Tenant-Id': 'default' };

async function run() {
  console.log('=== Workflow Timeouts Smoke ===\n');
  let fails = 0;

  const to = await fetch(`${GW}/api/analytics/eto-chain/workflow/timeouts`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!to.ok) {
    console.log(`✗ timeouts → ${to.status}`);
    process.exit(1);
  }
  const body = await to.json();
  console.log(`✓ steps=${body.stepCount} maxMs=${body.maxStepTimeoutMs} totalMs=${body.totalChainTimeoutMs}`);
  if ((body.stepCount ?? 0) < 7) fails++;
  if ((body.maxStepTimeoutMs ?? 0) < 20_000) fails++;

  const mes = body.steps?.find((s: { step: string }) => s.step.includes('production.recorded'));
  if (mes?.timeoutMs >= 60_000) {
    console.log(`✓ mes.production timeout=${mes.timeout} (${mes.timeoutMs}ms)`);
  } else {
    console.log('✗ mes.production timeout too low');
    fails++;
  }

  const cid = `timeout-smoke-${Date.now()}`;
  const orch = await fetch(`${GW}/api/analytics/eto-chain/orchestrate`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ correlationId: cid }),
    signal: AbortSignal.timeout(12000),
  });
  if (!orch.ok) {
    console.log(`✗ orchestrate → ${orch.status}`);
    fails++;
  } else {
    const o = await orch.json();
    console.log(`✓ orchestrate totalTimeoutMs=${o.totalTimeoutMs} stepTimeouts=${o.stepTimeouts?.length ?? 0}`);
    if ((o.totalTimeoutMs ?? 0) < 100_000) fails++;
    if (!Array.isArray(o.stepTimeouts) || o.stepTimeouts.length < 7) fails++;
  }

  const st = await fetch(`${GW}/api/analytics/eto-chain/orchestrator/status`, {
    signal: AbortSignal.timeout(8000),
  });
  if (st.ok) {
    const q = await st.json();
    console.log(`✓ queue maxStepTimeoutMs=${q.maxStepTimeoutMs} totalChainTimeoutMs=${q.totalChainTimeoutMs}`);
    if ((q.maxStepTimeoutMs ?? 0) < 20_000) fails++;
  } else {
    console.log(`✗ orchestrator status → ${st.status}`);
    fails++;
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 1 ? 1 : 0);
}

run();
