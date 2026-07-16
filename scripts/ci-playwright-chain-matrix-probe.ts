/**
 * W128 — CI Playwright all chains matrix probe (mandatory when CI_PLAYWRIGHT_CHAIN_MATRIX=true)
 */
async function run() {
  console.log('=== CI Playwright Chain Matrix Probe (W128) ===\n');
  const required = process.env.CI_PLAYWRIGHT_CHAIN_MATRIX === 'true';
  console.log(`CI_PLAYWRIGHT_CHAIN_MATRIX=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();

  let fails = 0;
  for (const name of [
    'scripts/ci-playwright-chain-matrix-probe.ts',
    'e2e/all-cross-chains-matrix.spec.ts',
    'e2e/pm-finance-tax-chain.spec.ts',
    'e2e/proc-inv-quality-chain.spec.ts',
    'e2e/mes-eam-crm-chain.spec.ts',
    'e2e/hr-plm-pm-chain.spec.ts',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/erp-ci.yml'), 'utf8');
    const hasJob = workflow.includes('playwright-all-chains-matrix');
    const block = workflow.split('playwright-all-chains-matrix:')[1]?.split('\n  playwright:')[0] ?? '';
    const noSkip = hasJob && !block.includes('continue-on-error: true');
    console.log(`${hasJob ? '✓' : '✗'} playwright-all-chains-matrix job`);
    console.log(`${noSkip ? '✓' : '✗'} job without continue-on-error`);
    if (!hasJob || !noSkip) fails++;
  } catch {
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-playwright-chain-matrix-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references chain matrix probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_PLAYWRIGHT_CHAIN_MATRIX not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
