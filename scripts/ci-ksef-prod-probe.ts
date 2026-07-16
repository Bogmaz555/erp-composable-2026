/**
 * W141 — CI KSeF production probe (mandatory when CI_KSEF_PROD=true)
 */
async function run() {
  console.log('=== CI KSeF Production Probe (W141) ===\n');
  const required = process.env.CI_KSEF_PROD === 'true';
  console.log(`CI_KSEF_PROD=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();
  let fails = 0;

  for (const name of [
    'scripts/ci-ksef-prod-probe.ts',
    'scripts/ensure-ksef-prod-ready.sh',
    'infra/ksef/KSEF-PROD-POLICY.md',
    'apps/tax-legal/src/ksef-production.service.ts',
    'apps/tax-legal/src/ksef-router.service.ts',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const ctrl = fs.readFileSync(path.join(ROOT, 'apps/tax-legal/src/tax-legal.controller.ts'), 'utf8');
    const ctrlOk = ctrl.includes('ksef/production/profile');
    console.log(`${ctrlOk ? '✓' : '✗'} ksef production profile endpoint`);
    if (!ctrlOk) fails++;
  } catch {
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-ksef-prod-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references ksef prod probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_KSEF_PROD not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}
run();
