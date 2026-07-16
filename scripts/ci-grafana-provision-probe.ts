/**
 * W91 — CI Grafana provision probe (mandatory when CI_GRAFANA_PROVISION=true)
 */
async function run() {
  console.log('=== CI Grafana Provision Probe (W91) ===\n');
  const required = process.env.CI_GRAFANA_PROVISION === 'true';
  console.log(`CI_GRAFANA_PROVISION=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();

  let fails = 0;
  for (const name of [
    'scripts/ci-grafana-provision-probe.ts',
    'scripts/ensure-grafana-ready.sh',
    'infra/prometheus/prometheus.yml',
    'infra/grafana/provisioning/dashboards/dashboard.yml',
    'infra/grafana/provisioning/datasources/prometheus.yml',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const compose = fs.readFileSync(path.join(ROOT, 'docker-compose.yml'), 'utf8');
    const composeOk =
      compose.includes('grafana:') && compose.includes('prometheus:') && compose.includes('observability');
    console.log(`${composeOk ? '✓' : '✗'} docker-compose observability profile`);
    if (!composeOk) fails++;
  } catch {
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-grafana-provision-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references Grafana probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_GRAFANA_PROVISION not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
