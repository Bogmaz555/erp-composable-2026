/**
 * ETO saga compensation smoke
 * Run: npx tsx scripts/saga-compensation-smoke.ts
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== Saga Compensation Smoke ===\n');
  let fails = 0;

  const postOpts = {
    method: 'POST' as const,
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': 'default' },
    body: '{}',
    signal: AbortSignal.timeout(30000),
  };
  let trigger = await fetch(`${GW}/api/analytics/eto-chain/trigger-demo`, postOpts);
  if (!trigger.ok) {
    await new Promise((r) => setTimeout(r, 2000));
    trigger = await fetch(`${GW}/api/analytics/eto-chain/trigger-demo`, postOpts);
  }
  if (!trigger.ok) {
    trigger = await fetch('http://127.0.0.1:4011/eto-chain/trigger-demo', postOpts);
  }
  if (!trigger.ok) {
    console.log(`✗ trigger-demo → ${trigger.status}`);
    process.exit(1);
  }
  const { correlationId } = await trigger.json();
  console.log(`✓ trigger-demo correlationId=${correlationId}`);

  const before = await fetch(
    `${GW}/api/analytics/eto-chain/status?correlationId=${encodeURIComponent(correlationId)}`,
    { signal: AbortSignal.timeout(8000) },
  );
  const beforeBody = before.ok ? await before.json() : null;
  const stepsBefore = beforeBody?.steps?.filter((s: { done: boolean }) => s.done).length ?? 0;
  console.log(`✓ steps before compensate: ${stepsBefore}`);

  const comp = await fetch(`${GW}/api/analytics/eto-chain/compensate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': 'default' },
    body: JSON.stringify({ correlationId }),
    signal: AbortSignal.timeout(15000),
  });
  if (!comp.ok) {
    console.log(`✗ compensate → ${comp.status}`);
    fails++;
  } else {
    const compBody = await comp.json();
    console.log(`✓ compensate status=${compBody.status} applied=${compBody.applied?.length ?? 0}`);
    if (compBody.status !== 'COMPENSATED') fails++;
  }

  const after = await fetch(
    `${GW}/api/analytics/eto-chain/status?correlationId=${encodeURIComponent(correlationId)}`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (after.ok) {
    const afterBody = await after.json();
    const stepsAfter = afterBody?.steps?.filter((s: { done: boolean }) => s.done).length ?? 0;
    console.log(`✓ steps after compensate: ${stepsAfter}`);
    if (stepsAfter > 0) fails++;
  }

  const logRes = await fetch(`${GW}/api/analytics/eto-chain/compensations?correlationId=${encodeURIComponent(correlationId)}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (logRes.ok) {
    const logBody = await logRes.json();
    console.log(`✓ compensation log entries: ${logBody.compensations?.length ?? 0}`);
    if ((logBody.compensations?.length ?? 0) < 1) fails++;
  } else {
    console.log(`✗ compensations → ${logRes.status}`);
    fails++;
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
