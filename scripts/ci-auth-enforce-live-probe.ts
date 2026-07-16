/**
 * W81 — CI auth enforce live probe (mandatory when CI_AUTH_ENFORCE_LIVE=true)
 */
async function run() {
  console.log('=== CI Auth Enforce Live Probe (W81) ===\n');
  const ciLive = process.env.CI_AUTH_ENFORCE_LIVE === 'true';
  console.log(`CI_AUTH_ENFORCE_LIVE=${ciLive}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();

  const checks = [
    ['scripts/ci-auth-enforce-live-probe.ts', fs.existsSync(path.join(ROOT, 'scripts/ci-auth-enforce-live-probe.ts'))],
    ['scripts/auth-enforce-smoke.ts', fs.existsSync(path.join(ROOT, 'scripts/auth-enforce-smoke.ts'))],
    ['scripts/auth-enforce-e2e.sh', fs.existsSync(path.join(ROOT, 'scripts/auth-enforce-e2e.sh'))],
    ['scripts/ensure-keycloak-ready.sh', fs.existsSync(path.join(ROOT, 'scripts/ensure-keycloak-ready.sh'))],
  ] as const;

  let fails = 0;
  for (const [name, ok] of checks) {
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/erp-ci.yml'), 'utf8');
    const wfOk = workflow.includes('auth-enforce-live') && workflow.includes('ci-auth-enforce-live-probe');
    console.log(`${wfOk ? '✓' : '✗'} GitHub workflow auth enforce live job`);
    if (!wfOk) fails++;
  } catch {
    console.log('✗ erp-ci.yml unreadable');
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-auth-enforce-live-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references live probe`);
    if (!gateOk) fails++;
  } catch {
    console.log('✗ ci-contract-gate unreadable');
    fails++;
  }

  if (!ciLive) {
    console.log('\nSKIP: CI_AUTH_ENFORCE_LIVE not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
