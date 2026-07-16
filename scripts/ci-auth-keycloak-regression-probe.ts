/**
 * W89 — CI AUTH_ENFORCE Keycloak regression probe (mandatory when CI_AUTH_ENFORCE_KEYCLOAK=true)
 */
async function run() {
  console.log('=== CI Auth Keycloak Regression Probe (W89) ===\n');
  const keycloak = process.env.CI_AUTH_ENFORCE_KEYCLOAK === 'true';
  console.log(`CI_AUTH_ENFORCE_KEYCLOAK=${keycloak}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();

  let fails = 0;
  for (const name of [
    'scripts/ci-auth-keycloak-regression-probe.ts',
    'scripts/ensure-keycloak-ready.sh',
    'scripts/auth-enforce-e2e.sh',
    'scripts/auth-enforce-smoke.ts',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/erp-ci.yml'), 'utf8');
    const wfOk =
      workflow.includes('auth-enforce-live') &&
      workflow.includes('ci-auth-keycloak-regression-probe') &&
      workflow.includes('CI_AUTH_ENFORCE_KEYCLOAK');
    console.log(`${wfOk ? '✓' : '✗'} GitHub workflow Keycloak regression wiring`);
    if (!wfOk) fails++;
  } catch {
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-auth-keycloak-regression-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references Keycloak probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!keycloak) {
    console.log('\nSKIP: CI_AUTH_ENFORCE_KEYCLOAK not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
