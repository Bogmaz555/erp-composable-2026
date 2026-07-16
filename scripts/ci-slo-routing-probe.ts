/**
 * W123 — CI SLO routing probe (mandatory when CI_SLO_ROUTING=true)
 */
async function run() {
  console.log('=== CI SLO Routing Probe (W123) ===\n');
  const required = process.env.CI_SLO_ROUTING === 'true';
  console.log(`CI_SLO_ROUTING=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();

  let fails = 0;
  for (const name of [
    'scripts/ci-slo-routing-probe.ts',
    'infra/alertmanager/routes/SLO-ROUTING.md',
    'infra/alertmanager/alertmanager.yml',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const am = fs.readFileSync(path.join(ROOT, 'infra/alertmanager/alertmanager.yml'), 'utf8');
    const pdOk = am.includes('domain: slo') && am.includes('erp-pagerduty') && am.includes('severity: critical');
    const ogOk = am.includes('erp-opsgenie') && am.includes('erp-oncall-off-hours');
    console.log(`${pdOk ? '✓' : '✗'} SLO PagerDuty escalation route`);
    console.log(`${ogOk ? '✓' : '✗'} SLO Opsgenie off-hours route`);
    if (!pdOk || !ogOk) fails++;
  } catch {
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-slo-routing-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references SLO routing probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_SLO_ROUTING not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
