/**
 * W80 — CI Playwright PM BI probe (mandatory when CI_PLAYWRIGHT_PM_BI=true)
 */
async function run() {
  console.log('=== CI Playwright PM BI Probe (W80) ===\n');
  const ciPlaywright = process.env.CI_PLAYWRIGHT_PM_BI === 'true';
  console.log(`CI_PLAYWRIGHT_PM_BI=${ciPlaywright}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();

  const checks = [
    ['e2e/pm-bi-panel.spec.ts', fs.existsSync(path.join(ROOT, 'e2e/pm-bi-panel.spec.ts'))],
    ['playwright.config.ts', fs.existsSync(path.join(ROOT, 'playwright.config.ts'))],
    ['scripts/ci-playwright-pm-bi-probe.ts', fs.existsSync(path.join(ROOT, 'scripts/ci-playwright-pm-bi-probe.ts'))],
  ] as const;

  let fails = 0;
  for (const [name, ok] of checks) {
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/erp-ci.yml'), 'utf8');
    const wfOk = workflow.includes('pm-bi-panel') && workflow.includes('ci-playwright-pm-bi-probe');
    console.log(`${wfOk ? '✓' : '✗'} GitHub workflow PM BI wiring`);
    if (!wfOk) fails++;
  } catch {
    console.log('✗ erp-ci.yml unreadable');
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-playwright-pm-bi-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references probe`);
    if (!gateOk) fails++;
  } catch {
    console.log('✗ ci-contract-gate unreadable');
    fails++;
  }

  if (!ciPlaywright) {
    console.log('\nSKIP: CI_PLAYWRIGHT_PM_BI not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
