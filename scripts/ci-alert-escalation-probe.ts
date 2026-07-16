/**
 * W103 — CI alert escalation probe (mandatory when CI_ALERT_ESCALATION=true)
 */
async function run() {
  console.log('=== CI Alert Escalation Probe (W103) ===\n');
  const required = process.env.CI_ALERT_ESCALATION === 'true';
  console.log(`CI_ALERT_ESCALATION=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();

  let fails = 0;
  for (const name of [
    'scripts/ci-alert-escalation-probe.ts',
    'infra/alertmanager/templates/pagerduty.tmpl',
    'infra/alertmanager/templates/opsgenie.tmpl',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const am = fs.readFileSync(path.join(ROOT, 'infra/alertmanager/alertmanager.yml'), 'utf8');
    const amOk =
      am.includes('pagerduty_configs') &&
      am.includes('opsgenie_configs') &&
      am.includes('erp-pagerduty');
    console.log(`${amOk ? '✓' : '✗'} alertmanager PagerDuty/Opsgenie receivers`);
    if (!amOk) fails++;
  } catch {
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-alert-escalation-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references escalation probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_ALERT_ESCALATION not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
