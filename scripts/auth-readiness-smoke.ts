/**
 * W37 — Auth readiness smoke (TD-001)
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== Auth Readiness Smoke (W37 / TD-001) ===\n');
  let fails = 0;

  const res = await fetch(`${GW}/api/analytics/platform/auth/readiness`, {
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) {
    console.log(`✗ platform/auth/readiness → ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log(`✓ ready=${body.ready} td001=${body.td001} roles=${body.roleCount}`);

  if (!body.ready) fails++;
  if (!['yellow-minimum', 'partial'].includes(body.td001)) fails++;
  if (body.roleCount < 7) fails++;

  const rolesRes = await fetch(`${GW}/api/analytics/auth/roles`, { signal: AbortSignal.timeout(5000) });
  if (!rolesRes.ok) {
    console.log(`✗ auth/roles → ${rolesRes.status}`);
    fails++;
  } else {
    const roles = await rolesRes.json();
    console.log(`✓ auth/roles count=${roles.roles?.length ?? 0}`);
  }

  const ctxRes = await fetch(`${GW}/api/analytics/auth/context`, {
    headers: { 'X-Dev-Role': 'ENGINEER' },
    signal: AbortSignal.timeout(5000),
  });
  if (ctxRes.ok) {
    const ctx = await ctxRes.json();
    console.log(`✓ auth/context activeRole=${ctx.activeRole} enforced=${ctx.authEnforced}`);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
