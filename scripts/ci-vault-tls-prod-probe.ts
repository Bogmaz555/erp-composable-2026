/**
 * W97 — CI Vault/TLS prod probe (mandatory when CI_VAULT_TLS_PROD=true)
 */
async function run() {
  console.log('=== CI Vault TLS Prod Probe (W97) ===\n');
  const required = process.env.CI_VAULT_TLS_PROD === 'true';
  console.log(`CI_VAULT_TLS_PROD=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();

  let fails = 0;
  for (const name of [
    'scripts/ci-vault-tls-prod-probe.ts',
    'scripts/ensure-vault-tls-ready.sh',
    'scripts/generate-dev-tls-certs.sh',
    'infra/vault/vault.hcl',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const compose = fs.readFileSync(path.join(ROOT, 'docker-compose.yml'), 'utf8');
    const composeOk = compose.includes('vault:') && compose.includes('prod-security');
    console.log(`${composeOk ? '✓' : '✗'} docker-compose prod-security profile`);
    if (!composeOk) fails++;
  } catch {
    fails++;
  }

  try {
    const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/erp-ci.yml'), 'utf8');
    const wfOk = workflow.includes('ci-vault-tls-prod-probe') && workflow.includes('CI_VAULT_TLS_PROD');
    console.log(`${wfOk ? '✓' : '✗'} GitHub workflow Vault/TLS wiring`);
    if (!wfOk) fails++;
  } catch {
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-vault-tls-prod-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references Vault/TLS probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_VAULT_TLS_PROD not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
