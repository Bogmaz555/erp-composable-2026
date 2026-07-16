/**
 * W95 — CI BI alerts probe (mandatory when CI_BI_ALERTS=true)
 */
async function run() {
  console.log('=== CI BI Alerts Probe (W95) ===\n');
  const required = process.env.CI_BI_ALERTS === 'true';
  console.log(`CI_BI_ALERTS=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();

  let fails = 0;
  for (const name of [
    'scripts/ci-bi-alerts-probe.ts',
    'infra/prometheus/alerts/bi-retention.yml',
    'infra/alertmanager/alertmanager.yml',
    'infra/grafana/provisioning/alerting/bi-retention.yaml',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const prom = fs.readFileSync(path.join(ROOT, 'infra/prometheus/prometheus.yml'), 'utf8');
    const promOk = prom.includes('rule_files') && prom.includes('alertmanagers');
    console.log(`${promOk ? '✓' : '✗'} prometheus alerting wiring`);
    if (!promOk) fails++;
  } catch {
    fails++;
  }

  try {
    const compose = fs.readFileSync(path.join(ROOT, 'docker-compose.yml'), 'utf8');
    const composeOk = compose.includes('alertmanager:');
    console.log(`${composeOk ? '✓' : '✗'} docker-compose alertmanager`);
    if (!composeOk) fails++;
  } catch {
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-bi-alerts-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references BI alerts probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_BI_ALERTS not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
