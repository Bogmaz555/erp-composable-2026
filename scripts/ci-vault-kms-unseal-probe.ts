/**
 * W121 — CI Vault KMS unseal probe (mandatory when CI_VAULT_KMS_UNSEAL=true)
 */
async function run() {
  console.log('=== CI Vault KMS Unseal Probe (W121) ===\n');
  const required = process.env.CI_VAULT_KMS_UNSEAL === 'true';
  console.log(`CI_VAULT_KMS_UNSEAL=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();

  let fails = 0;
  for (const name of [
    'scripts/ci-vault-kms-unseal-probe.ts',
    'scripts/ensure-vault-kms-unseal-ready.sh',
    'scripts/rotate-vault-unseal-keys.sh',
    'infra/vault/kms/kms-unseal.hcl',
    'infra/vault/kms/UNSEAL-POLICY.md',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/erp-ci.yml'), 'utf8');
    const wfOk = wf.includes('ci-vault-kms-unseal-probe') && wf.includes('CI_VAULT_KMS_UNSEAL');
    console.log(`${wfOk ? '✓' : '✗'} GitHub workflow Vault KMS wiring`);
    if (!wfOk) fails++;
  } catch {
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-vault-kms-unseal-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references Vault KMS probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_VAULT_KMS_UNSEAL not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
