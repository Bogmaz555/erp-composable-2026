/**
 * W115 — CI Grafana SLO dashboard probe (mandatory when CI_GRAFANA_SLO_DASHBOARD=true)
 */
async function run() {
  console.log('=== CI Grafana SLO Dashboard Probe (W115) ===\n');
  const required = process.env.CI_GRAFANA_SLO_DASHBOARD === 'true';
  console.log(`CI_GRAFANA_SLO_DASHBOARD=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();

  let fails = 0;
  for (const name of [
    'scripts/ci-grafana-slo-dashboard-probe.ts',
    'infra/grafana/dashboards/slo-error-budget.json',
    'infra/prometheus/alerts/slo-burn-rate.yml',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const dash = fs.readFileSync(path.join(ROOT, 'infra/grafana/dashboards/slo-error-budget.json'), 'utf8');
    const dashOk =
      dash.includes('erp-slo-error-budget') &&
      dash.includes('erp_bi_snapshot_total') &&
      dash.includes('fast_burn');
    console.log(`${dashOk ? '✓' : '✗'} SLO error budget dashboard panels`);
    if (!dashOk) fails++;
  } catch {
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-grafana-slo-dashboard-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references SLO dashboard probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_GRAFANA_SLO_DASHBOARD not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
