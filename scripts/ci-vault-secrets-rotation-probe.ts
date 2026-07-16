/**
 * W117 — CI Vault secrets rotation probe (mandatory when CI_VAULT_SECRETS_ROTATION=true)
 */
async function run() {
  console.log('=== CI Vault Secrets Rotation Probe (W117) ===\n');
  const required = process.env.CI_VAULT_SECRETS_ROTATION === 'true';
  console.log(`CI_VAULT_SECRETS_ROTATION=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();

  let fails = 0;
  for (const name of [
    'scripts/ci-vault-secrets-rotation-probe.ts',
    'scripts/rotate-vault-secrets.sh',
    'scripts/ensure-vault-secrets-ready.sh',
    'infra/vault/rotation/ROTATION-POLICY.md',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/erp-ci.yml'), 'utf8');
    const wfOk = wf.includes('ci-vault-secrets-rotation-probe') && wf.includes('CI_VAULT_SECRETS_ROTATION');
    console.log(`${wfOk ? '✓' : '✗'} GitHub workflow Vault secrets rotation wiring`);
    if (!wfOk) fails++;
  } catch {
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-vault-secrets-rotation-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references Vault secrets probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_VAULT_SECRETS_ROTATION not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
