/**
 * W132 — CI Playwright visual probe (mandatory when CI_PLAYWRIGHT_VISUAL=true)
 */
async function run() {
  console.log('=== CI Playwright Visual Probe (W132) ===\n');
  const required = process.env.CI_PLAYWRIGHT_VISUAL === 'true';
  console.log(`CI_PLAYWRIGHT_VISUAL=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();
  let fails = 0;

  for (const name of [
    'scripts/ci-playwright-visual-probe.ts',
    'e2e/visual-baseline.spec.ts',
    'infra/playwright/VISUAL-BASELINE.md',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const cfg = fs.readFileSync(path.join(ROOT, 'playwright.config.ts'), 'utf8');
    const cfgOk = cfg.includes('snapshotPathTemplate') && cfg.includes('toHaveScreenshot');
    console.log(`${cfgOk ? '✓' : '✗'} playwright.config visual settings`);
    if (!cfgOk) fails++;
  } catch {
    fails++;
  }

  try {
    const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/erp-ci.yml'), 'utf8');
    const hasJob = wf.includes('playwright-visual-baseline');
    const block = wf.split('playwright-visual-baseline:')[1]?.split('\n  playwright:')[0] ?? '';
    const noSkip = hasJob && !block.includes('continue-on-error: true');
    console.log(`${hasJob ? '✓' : '✗'} playwright-visual-baseline job`);
    console.log(`${noSkip ? '✓' : '✗'} job without continue-on-error`);
    if (!hasJob || !noSkip) fails++;
  } catch {
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-playwright-visual-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references visual probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_PLAYWRIGHT_VISUAL not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}
run();
