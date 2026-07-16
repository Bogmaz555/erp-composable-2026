/**
 * W107 — CI alert on-call rotation probe (mandatory when CI_ALERT_ONCALL=true)
 */
async function run() {
  console.log('=== CI Alert Oncall Probe (W107) ===\n');
  const required = process.env.CI_ALERT_ONCALL === 'true';
  console.log(`CI_ALERT_ONCALL=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();

  let fails = 0;
  for (const name of [
    'scripts/ci-alert-oncall-probe.ts',
    'infra/alertmanager/time_intervals/oncall.yml',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const am = fs.readFileSync(path.join(ROOT, 'infra/alertmanager/alertmanager.yml'), 'utf8');
    const amOk =
      am.includes('time_intervals:') &&
      am.includes('erp-oncall-business-hours') &&
      am.includes('active_time_intervals');
    console.log(`${amOk ? '✓' : '✗'} alertmanager on-call time_intervals`);
    if (!amOk) fails++;
  } catch {
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-alert-oncall-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references oncall probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_ALERT_ONCALL not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
