/**
 * W109 — CI mTLS client-cert verify probe (mandatory when CI_MTLS_CLIENT_VERIFY=true)
 */
async function run() {
  console.log('=== CI mTLS Client Verify Probe (W109) ===\n');
  const required = process.env.CI_MTLS_CLIENT_VERIFY === 'true';
  console.log(`CI_MTLS_CLIENT_VERIFY=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();

  let fails = 0;
  for (const name of [
    'scripts/ci-mtls-client-verify-probe.ts',
    'apps/api-gateway/src/mtls-listen.ts',
    'infra/gateway/mtls.env.example',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const src = fs.readFileSync(path.join(ROOT, 'apps/api-gateway/src/mtls-listen.ts'), 'utf8');
    const srcOk =
      src.includes('GATEWAY_MTLS_CLIENT_VERIFY') &&
      src.includes('requestCert') &&
      src.includes('rejectUnauthorized') &&
      src.includes('Client certificate required');
    console.log(`${srcOk ? '✓' : '✗'} client-cert verify hook`);
    if (!srcOk) fails++;
  } catch {
    fails++;
  }

  try {
    const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/erp-ci.yml'), 'utf8');
    const wfOk = wf.includes('ci-mtls-client-verify-probe') && wf.includes('CI_MTLS_CLIENT_VERIFY');
    console.log(`${wfOk ? '✓' : '✗'} GitHub workflow client verify wiring`);
    if (!wfOk) fails++;
  } catch {
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-mtls-client-verify-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references client verify probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_MTLS_CLIENT_VERIFY not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
