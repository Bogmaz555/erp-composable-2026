/**
 * W92 — CI Playwright matrix probe (mandatory when CI_PLAYWRIGHT_MATRIX=true)
 */
async function run() {
  console.log('=== CI Playwright Matrix Probe (W92) ===\n');
  const required = process.env.CI_PLAYWRIGHT_MATRIX === 'true';
  console.log(`CI_PLAYWRIGHT_MATRIX=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();

  let fails = 0;
  for (const name of [
    'scripts/ci-playwright-matrix-probe.ts',
    'scripts/ci-playwright-stack-boot.sh',
    'e2e/pm-bi-panel.spec.ts',
    'e2e/finance-module.spec.ts',
    'e2e/inv-module.spec.ts',
    'e2e/proc-module.spec.ts',
    'e2e/quality-module.spec.ts',
    'e2e/mes-module.spec.ts',
    'e2e/eam-module.spec.ts',
    'e2e/crm-module.spec.ts',
    'e2e/tax-module.spec.ts',
    'e2e/hr-module.spec.ts',
    'e2e/plm-module.spec.ts',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/erp-ci.yml'), 'utf8');
    const hasJob = workflow.includes('playwright-matrix');
    const block = workflow.split('playwright-matrix:')[1]?.split('\n  playwright:')[0] ?? '';
    const noSkip = hasJob && !block.includes('continue-on-error: true');
    console.log(`${hasJob ? '✓' : '✗'} playwright-matrix job`);
    console.log(`${noSkip ? '✓' : '✗'} job without continue-on-error`);
    if (!hasJob || !noSkip) fails++;
  } catch {
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-playwright-matrix-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references matrix probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_PLAYWRIGHT_MATRIX not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
