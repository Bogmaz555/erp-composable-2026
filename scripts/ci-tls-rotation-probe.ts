/**
 * W113 — CI TLS rotation probe (mandatory when CI_TLS_ROTATION=true)
 */
async function run() {
  console.log('=== CI TLS Rotation Probe (W113) ===\n');
  const required = process.env.CI_TLS_ROTATION === 'true';
  console.log(`CI_TLS_ROTATION=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();

  let fails = 0;
  for (const name of [
    'scripts/ci-tls-rotation-probe.ts',
    'scripts/rotate-tls-certs.sh',
    'scripts/ensure-tls-rotation-ready.sh',
    'infra/tls/rotation/ROTATION-POLICY.md',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/erp-ci.yml'), 'utf8');
    const wfOk = wf.includes('ci-tls-rotation-probe') && wf.includes('CI_TLS_ROTATION');
    console.log(`${wfOk ? '✓' : '✗'} GitHub workflow TLS rotation wiring`);
    if (!wfOk) fails++;
  } catch {
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-tls-rotation-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references TLS rotation probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_TLS_ROTATION not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
