/**
 * W101 — CI mTLS gateway probe (mandatory when CI_MTLS_GATEWAY=true)
 */
async function run() {
  console.log('=== CI mTLS Gateway Probe (W101) ===\n');
  const required = process.env.CI_MTLS_GATEWAY === 'true';
  console.log(`CI_MTLS_GATEWAY=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();

  let fails = 0;
  for (const name of [
    'scripts/ci-mtls-gateway-probe.ts',
    'scripts/ensure-mtls-gateway-ready.sh',
    'scripts/generate-mtls-certs.sh',
    'infra/gateway/mtls.env.example',
    'apps/api-gateway/src/mtls-listen.ts',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const compose = fs.readFileSync(path.join(ROOT, 'docker-compose.yml'), 'utf8');
    const composeOk = compose.includes('prod-security');
    console.log(`${composeOk ? '✓' : '✗'} docker-compose prod-security profile`);
    if (!composeOk) fails++;
  } catch {
    fails++;
  }

  try {
    const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/erp-ci.yml'), 'utf8');
    const wfOk = wf.includes('ci-mtls-gateway-probe') && wf.includes('CI_MTLS_GATEWAY');
    console.log(`${wfOk ? '✓' : '✗'} GitHub workflow mTLS wiring`);
    if (!wfOk) fails++;
  } catch {
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-mtls-gateway-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references mTLS probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_MTLS_GATEWAY not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
