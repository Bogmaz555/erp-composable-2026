/**
 * W129 — CI Vault HA probe (mandatory when CI_VAULT_HA=true)
 */
async function run() {
  console.log('=== CI Vault HA Probe (W129) ===\n');
  const required = process.env.CI_VAULT_HA === 'true';
  console.log(`CI_VAULT_HA=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();

  let fails = 0;
  for (const name of [
    'scripts/ci-vault-ha-probe.ts',
    'scripts/ensure-vault-ha-ready.sh',
    'infra/vault/ha/ha-config.hcl',
    'infra/vault/ha/HA-POLICY.md',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const compose = fs.readFileSync(path.join(ROOT, 'docker-compose.yml'), 'utf8');
    const ok = compose.includes('vault-ha:') && compose.includes('prod-observability');
    console.log(`${ok ? '✓' : '✗'} docker-compose vault-ha service`);
    if (!ok) fails++;
  } catch {
    fails++;
  }

  try {
    const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/erp-ci.yml'), 'utf8');
    const wfOk = wf.includes('ci-vault-ha-probe') && wf.includes('CI_VAULT_HA');
    console.log(`${wfOk ? '✓' : '✗'} GitHub workflow Vault HA wiring`);
    if (!wfOk) fails++;
  } catch {
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-vault-ha-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references Vault HA probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_VAULT_HA not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
