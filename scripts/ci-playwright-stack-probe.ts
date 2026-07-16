/**
 * W84 — CI Playwright stack probe (mandatory when CI_PLAYWRIGHT_STACK=true)
 */
async function run() {
  console.log('=== CI Playwright Stack Probe (W84) ===\n');
  const ciStack = process.env.CI_PLAYWRIGHT_STACK === 'true';
  console.log(`CI_PLAYWRIGHT_STACK=${ciStack}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();

  const checks = [
    ['scripts/ci-playwright-stack-boot.sh', fs.existsSync(path.join(ROOT, 'scripts/ci-playwright-stack-boot.sh'))],
    ['scripts/ci-playwright-stack-probe.ts', fs.existsSync(path.join(ROOT, 'scripts/ci-playwright-stack-probe.ts'))],
    ['e2e/pm-bi-panel.spec.ts', fs.existsSync(path.join(ROOT, 'e2e/pm-bi-panel.spec.ts'))],
  ] as const;

  let fails = 0;
  for (const [name, ok] of checks) {
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/erp-ci.yml'), 'utf8');
    const wfOk =
      workflow.includes('ci-playwright-stack-boot') && workflow.includes('ci-playwright-stack-probe');
    console.log(`${wfOk ? '✓' : '✗'} GitHub workflow stack wiring`);
    if (!wfOk) fails++;
  } catch {
    console.log('✗ erp-ci.yml unreadable');
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-playwright-stack-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references stack probe`);
    if (!gateOk) fails++;
  } catch {
    console.log('✗ ci-contract-gate unreadable');
    fails++;
  }

  if (!ciStack) {
    console.log('\nSKIP: CI_PLAYWRIGHT_STACK not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
