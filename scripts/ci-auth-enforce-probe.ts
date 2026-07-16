/**
 * W77 — CI auth enforce probe (mandatory when CI_AUTH_ENFORCE=true)
 */
const ROOT = process.cwd();

async function run() {
  console.log('=== CI Auth Enforce Probe (W77) ===\n');
  const ciAuthEnforce = process.env.CI_AUTH_ENFORCE === 'true';
  console.log(`CI_AUTH_ENFORCE=${ciAuthEnforce}`);

  const fs = await import('fs');
  const path = await import('path');
  const checks = [
    ['scripts/ci-auth-enforce-probe.ts', fs.existsSync(path.join(ROOT, 'scripts/ci-auth-enforce-probe.ts'))],
    ['scripts/auth-enforce-e2e.sh', fs.existsSync(path.join(ROOT, 'scripts/auth-enforce-e2e.sh'))],
    ['scripts/auth-enforce-smoke.ts', fs.existsSync(path.join(ROOT, 'scripts/auth-enforce-smoke.ts'))],
  ] as const;

  let fails = 0;
  for (const [name, ok] of checks) {
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-auth-enforce-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references probe`);
    if (!gateOk) fails++;
  } catch {
    console.log('✗ ci-contract-gate unreadable');
    fails++;
  }

  try {
    const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/erp-ci.yml'), 'utf8');
    const wfOk = workflow.includes('CI_AUTH_ENFORCE') && workflow.includes('ci-auth-enforce-probe');
    console.log(`${wfOk ? '✓' : '✗'} GitHub workflow auth enforce step`);
    if (!wfOk) fails++;
  } catch {
    console.log('✗ erp-ci.yml unreadable');
    fails++;
  }

  if (!ciAuthEnforce) {
    console.log('\nSKIP: CI_AUTH_ENFORCE not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
