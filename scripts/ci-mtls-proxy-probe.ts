/**
 * W105 — CI mTLS full proxy probe (mandatory when CI_MTLS_PROXY=true)
 */
async function run() {
  console.log('=== CI mTLS Proxy Probe (W105) ===\n');
  const required = process.env.CI_MTLS_PROXY === 'true';
  console.log(`CI_MTLS_PROXY=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();

  let fails = 0;
  for (const name of [
    'scripts/ci-mtls-proxy-probe.ts',
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
      src.includes('startMtlsProxySidecar') &&
      src.includes('GATEWAY_MTLS_PROXY') &&
      src.includes('4446');
    console.log(`${srcOk ? '✓' : '✗'} mTLS full proxy hook`);
    if (!srcOk) fails++;
  } catch {
    fails++;
  }

  try {
    const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/erp-ci.yml'), 'utf8');
    const wfOk = wf.includes('ci-mtls-proxy-probe') && wf.includes('CI_MTLS_PROXY');
    console.log(`${wfOk ? '✓' : '✗'} GitHub workflow mTLS proxy wiring`);
    if (!wfOk) fails++;
  } catch {
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-mtls-proxy-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references mTLS proxy probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_MTLS_PROXY not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
