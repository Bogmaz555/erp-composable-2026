/**
 * W99 — CI alert notify channels probe (mandatory when CI_ALERT_NOTIFY=true)
 */
async function run() {
  console.log('=== CI Alert Notify Probe (W99) ===\n');
  const required = process.env.CI_ALERT_NOTIFY === 'true';
  console.log(`CI_ALERT_NOTIFY=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();

  let fails = 0;
  for (const name of [
    'scripts/ci-alert-notify-probe.ts',
    'infra/alertmanager/templates/slack.tmpl',
    'infra/alertmanager/templates/email.tmpl',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const am = fs.readFileSync(path.join(ROOT, 'infra/alertmanager/alertmanager.yml'), 'utf8');
    const amOk = am.includes('slack_configs') && am.includes('email_configs') && am.includes('templates:');
    console.log(`${amOk ? '✓' : '✗'} alertmanager Slack/email receivers`);
    if (!amOk) fails++;
  } catch {
    fails++;
  }

  try {
    const compose = fs.readFileSync(path.join(ROOT, 'docker-compose.yml'), 'utf8');
    const composeOk = compose.includes('alertmanager/templates');
    console.log(`${composeOk ? '✓' : '✗'} docker-compose templates mount`);
    if (!composeOk) fails++;
  } catch {
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-alert-notify-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references notify probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_ALERT_NOTIFY not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
