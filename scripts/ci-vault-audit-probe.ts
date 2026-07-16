/**
 * W125 — CI Vault audit probe (mandatory when CI_VAULT_AUDIT=true)
 */
async function run() {
  console.log('=== CI Vault Audit Probe (W125) ===\n');
  const required = process.env.CI_VAULT_AUDIT === 'true';
  console.log(`CI_VAULT_AUDIT=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();

  let fails = 0;
  for (const name of [
    'scripts/ci-vault-audit-probe.ts',
    'scripts/ensure-vault-audit-ready.sh',
    'scripts/rotate-vault-audit-log.sh',
    'infra/vault/audit/AUDIT-POLICY.md',
    'infra/vault/audit/audit-device.hcl',
    'infra/vault/rotation/ROTATION-POLICY.md',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/erp-ci.yml'), 'utf8');
    const wfOk = wf.includes('ci-vault-audit-probe') && wf.includes('CI_VAULT_AUDIT');
    console.log(`${wfOk ? '✓' : '✗'} GitHub workflow Vault audit wiring`);
    if (!wfOk) fails++;
  } catch {
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-vault-audit-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references Vault audit probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_VAULT_AUDIT not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
