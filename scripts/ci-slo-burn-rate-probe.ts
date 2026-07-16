/**
 * W111 — CI SLO burn-rate probe (mandatory when CI_SLO_BURN_RATE=true)
 */
async function run() {
  console.log('=== CI SLO Burn Rate Probe (W111) ===\n');
  const required = process.env.CI_SLO_BURN_RATE === 'true';
  console.log(`CI_SLO_BURN_RATE=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();

  let fails = 0;
  for (const name of [
    'scripts/ci-slo-burn-rate-probe.ts',
    'infra/prometheus/alerts/slo-burn-rate.yml',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const rules = fs.readFileSync(path.join(ROOT, 'infra/prometheus/alerts/slo-burn-rate.yml'), 'utf8');
    const rulesOk =
      rules.includes('SloBurnRateFast') &&
      rules.includes('SloBurnRateSlow') &&
      rules.includes('[5m]') &&
      rules.includes('[6h]');
    console.log(`${rulesOk ? '✓' : '✗'} multi-window burn rate rules`);
    if (!rulesOk) fails++;
  } catch {
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-slo-burn-rate-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references SLO probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_SLO_BURN_RATE not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
