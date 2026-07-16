/**
 * W127 — CI prod observability probe (mandatory when CI_PROD_OBSERVABILITY=true)
 */
async function run() {
  console.log('=== CI Prod Observability Probe (W127) ===\n');
  const required = process.env.CI_PROD_OBSERVABILITY === 'true';
  console.log(`CI_PROD_OBSERVABILITY=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();

  let fails = 0;
  for (const name of [
    'scripts/ci-prod-observability-probe.ts',
    'scripts/ensure-prod-observability-ready.sh',
    'infra/observability/PROD-OBSERVABILITY.md',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const compose = fs.readFileSync(path.join(ROOT, 'docker-compose.yml'), 'utf8');
    const ok = compose.includes('prod-observability') && compose.includes('vault-ha');
    console.log(`${ok ? '✓' : '✗'} docker-compose prod-observability profile`);
    if (!ok) fails++;
  } catch {
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-prod-observability-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references prod observability probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_PROD_OBSERVABILITY not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
