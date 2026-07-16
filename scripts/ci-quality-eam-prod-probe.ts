/**
 * W137 — CI Quality/EAM production probe (mandatory when CI_QUALITY_EAM_PROD=true)
 */
async function run() {
  console.log('=== CI Quality/EAM Production Probe (W137) ===\n');
  const required = process.env.CI_QUALITY_EAM_PROD === 'true';
  console.log(`CI_QUALITY_EAM_PROD=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();
  let fails = 0;

  for (const name of [
    'scripts/ci-quality-eam-prod-probe.ts',
    'scripts/ensure-quality-eam-prod-ready.sh',
    'infra/quality/QUALITY-EAM-PROD-POLICY.md',
    'apps/quality-service/src/ncr-capa-production.controller.ts',
    'apps/quality-service/src/ncr-capa-production.service.ts',
    'apps/eam-service/src/eam-production.controller.ts',
    'apps/eam-service/src/eam-production.service.ts',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-quality-eam-prod-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references quality-eam probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_QUALITY_EAM_PROD not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}
run();
