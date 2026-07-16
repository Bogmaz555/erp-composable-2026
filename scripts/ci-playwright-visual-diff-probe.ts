/**
 * W136 — CI Playwright visual diff probe (mandatory when CI_PLAYWRIGHT_VISUAL_DIFF=true)
 */
async function run() {
  console.log('=== CI Playwright Visual Diff Probe (W136) ===\n');
  const required = process.env.CI_PLAYWRIGHT_VISUAL_DIFF === 'true';
  console.log(`CI_PLAYWRIGHT_VISUAL_DIFF=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();
  let fails = 0;

  for (const name of [
    'scripts/ci-playwright-visual-diff-probe.ts',
    'e2e/visual-baseline.spec.ts',
    'infra/playwright/VISUAL-DIFF-GATE.md',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  let hasPng = false;
  try {
    const dir = path.join(ROOT, 'e2e/visual-baseline');
    const walk = (d: string): boolean => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory() && walk(p)) return true;
        if (e.isFile() && e.name.endsWith('.png')) return true;
      }
      return false;
    };
    hasPng = fs.existsSync(dir) && walk(dir);
  } catch {
    hasPng = false;
  }
  console.log(`${hasPng ? '✓' : '✗'} baseline PNG snapshots exist`);
  if (!hasPng) fails++;

  try {
    const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/erp-ci.yml'), 'utf8');
    const hasJob = wf.includes('playwright-visual-diff');
    const block = wf.split('playwright-visual-diff:')[1]?.split('\n  playwright:')[0] ?? '';
    const strict = hasJob && !block.includes('--update-snapshots') && !block.includes('continue-on-error: true');
    console.log(`${hasJob ? '✓' : '✗'} playwright-visual-diff job`);
    console.log(`${strict ? '✓' : '✗'} strict diff (no update-snapshots fallback)`);
    if (!hasJob || !strict) fails++;
  } catch {
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-playwright-visual-diff-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references visual diff probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_PLAYWRIGHT_VISUAL_DIFF not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}
run();
