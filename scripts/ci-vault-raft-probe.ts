/**
 * W133 — CI Vault Raft probe (mandatory when CI_VAULT_RAFT=true)
 */
async function run() {
  console.log('=== CI Vault Raft Probe (W133) ===\n');
  const required = process.env.CI_VAULT_RAFT === 'true';
  console.log(`CI_VAULT_RAFT=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();
  let fails = 0;

  for (const name of [
    'scripts/ci-vault-raft-probe.ts',
    'scripts/ensure-vault-raft-ready.sh',
    'infra/vault/raft/raft-config.hcl',
    'infra/vault/raft/RAFT-POLICY.md',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const compose = fs.readFileSync(path.join(ROOT, 'docker-compose.yml'), 'utf8');
    const ok = compose.includes('vault-raft:') && compose.includes('prod-observability');
    console.log(`${ok ? '✓' : '✗'} docker-compose vault-raft service`);
    if (!ok) fails++;
  } catch {
    fails++;
  }

  try {
    const cfg = fs.readFileSync(path.join(ROOT, 'infra/vault/raft/raft-config.hcl'), 'utf8');
    const cfgOk = cfg.includes('storage "raft"');
    console.log(`${cfgOk ? '✓' : '✗'} Raft storage config`);
    if (!cfgOk) fails++;
  } catch {
    fails++;
  }

  try {
    const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/erp-ci.yml'), 'utf8');
    const wfOk = wf.includes('ci-vault-raft-probe') && wf.includes('CI_VAULT_RAFT');
    console.log(`${wfOk ? '✓' : '✗'} GitHub workflow Vault Raft wiring`);
    if (!wfOk) fails++;
  } catch {
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-vault-raft-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references Vault Raft probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_VAULT_RAFT not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}
run();
