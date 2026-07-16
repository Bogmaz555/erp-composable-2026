/**
 * W119 — CI SLO alerting probe (mandatory when CI_SLO_ALERTING=true)
 */
async function run() {
  console.log('=== CI SLO Alerting Probe (W119) ===\n');
  const required = process.env.CI_SLO_ALERTING === 'true';
  console.log(`CI_SLO_ALERTING=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();

  let fails = 0;
  for (const name of [
    'scripts/ci-slo-alerting-probe.ts',
    'infra/grafana/provisioning/alerting/slo-error-budget.yaml',
    'infra/grafana/provisioning/alerting/contact-points.yaml',
    'infra/alertmanager/alertmanager.yml',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const am = fs.readFileSync(path.join(ROOT, 'infra/alertmanager/alertmanager.yml'), 'utf8');
    const amOk = am.includes('domain: slo') && am.includes('erp-slo');
    console.log(`${amOk ? '✓' : '✗'} Alertmanager SLO routing`);
    if (!amOk) fails++;
  } catch {
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-slo-alerting-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references SLO alerting probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_SLO_ALERTING not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
