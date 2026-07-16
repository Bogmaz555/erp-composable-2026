/**
 * W124 — CI Playwright HR→PLM→PM probe (mandatory when CI_PLAYWRIGHT_HR_PLM_PM=true)
 */
async function run() {
  console.log('=== CI Playwright HR PLM PM Probe (W124) ===\n');
  const required = process.env.CI_PLAYWRIGHT_HR_PLM_PM === 'true';
  console.log(`CI_PLAYWRIGHT_HR_PLM_PM=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();

  let fails = 0;
  for (const name of [
    'scripts/ci-playwright-hr-plm-pm-probe.ts',
    'scripts/ci-playwright-stack-boot.sh',
    'e2e/hr-plm-pm-chain.spec.ts',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/erp-ci.yml'), 'utf8');
    const hasJob = workflow.includes('playwright-hr-plm-pm-chain');
    const block = workflow.split('playwright-hr-plm-pm-chain:')[1]?.split('\n  playwright:')[0] ?? '';
    const noSkip = hasJob && !block.includes('continue-on-error: true');
    console.log(`${hasJob ? '✓' : '✗'} playwright-hr-plm-pm-chain job`);
    console.log(`${noSkip ? '✓' : '✗'} job without continue-on-error`);
    if (!hasJob || !noSkip) fails++;
  } catch {
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-playwright-hr-plm-pm-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references hr-plm-pm probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_PLAYWRIGHT_HR_PLM_PM not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
