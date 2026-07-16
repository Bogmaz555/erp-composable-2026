/**
 * W85 — CI AUTH_ENFORCE regression probe (mandatory when CI_AUTH_ENFORCE_REGRESSION=true)
 */
async function run() {
  console.log('=== CI Auth Enforce Regression Probe (W85) ===\n');
  const ciRegression = process.env.CI_AUTH_ENFORCE_REGRESSION === 'true';
  console.log(`CI_AUTH_ENFORCE_REGRESSION=${ciRegression}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();

  const checks = [
    ['scripts/ci-auth-enforce-regression-probe.ts', fs.existsSync(path.join(ROOT, 'scripts/ci-auth-enforce-regression-probe.ts'))],
    ['scripts/auth-enforce-smoke.ts', fs.existsSync(path.join(ROOT, 'scripts/auth-enforce-smoke.ts'))],
    ['scripts/master-regression-report.ts', fs.existsSync(path.join(ROOT, 'scripts/master-regression-report.ts'))],
  ] as const;

  let fails = 0;
  for (const [name, ok] of checks) {
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/erp-ci.yml'), 'utf8');
    const wfOk =
      workflow.includes('CI_AUTH_ENFORCE_REGRESSION') &&
      workflow.includes('ci-auth-enforce-regression-probe');
    console.log(`${wfOk ? '✓' : '✗'} GitHub workflow auth regression wiring`);
    if (!wfOk) fails++;
  } catch {
    console.log('✗ erp-ci.yml unreadable');
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-auth-enforce-regression-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references regression probe`);
    if (!gateOk) fails++;
  } catch {
    console.log('✗ ci-contract-gate unreadable');
    fails++;
  }

  if (!ciRegression) {
    console.log('\nSKIP: CI_AUTH_ENFORCE_REGRESSION not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
