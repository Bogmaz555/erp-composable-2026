/**
 * W93 — CI AUTH_ENFORCE prod probe (mandatory when CI_AUTH_ENFORCE_PROD=true)
 */
async function run() {
  console.log('=== CI Auth Enforce Prod Probe (W93) ===\n');
  const required = process.env.CI_AUTH_ENFORCE_PROD === 'true';
  console.log(`CI_AUTH_ENFORCE_PROD=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();

  let fails = 0;
  for (const name of [
    'scripts/ci-auth-enforce-prod-probe.ts',
    'scripts/ensure-keycloak-ready.sh',
    'scripts/auth-enforce-smoke.ts',
    'scripts/auth-enforce-e2e.sh',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/erp-ci.yml'), 'utf8');
    const hasJob = workflow.includes('auth-enforce-live');
    const block = workflow.split('auth-enforce-live:')[1]?.split('\n  docker-smoke:')[0] ?? '';
    const noSkip = hasJob && !block.includes('continue-on-error: true');
    const prodWiring =
      workflow.includes('ci-auth-enforce-prod-probe') && workflow.includes('CI_AUTH_ENFORCE_PROD');
    console.log(`${hasJob ? '✓' : '✗'} auth-enforce-live job`);
    console.log(`${noSkip ? '✓' : '✗'} job without continue-on-error`);
    console.log(`${prodWiring ? '✓' : '✗'} prod probe wiring`);
    if (!hasJob || !noSkip || !prodWiring) fails++;
  } catch {
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-auth-enforce-prod-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references prod probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_AUTH_ENFORCE_PROD not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
