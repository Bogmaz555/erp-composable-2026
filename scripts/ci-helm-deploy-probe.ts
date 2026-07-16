/**
 * W135 — CI Helm deploy probe (mandatory when CI_HELM_DEPLOY=true)
 */
async function run() {
  console.log('=== CI Helm Deploy Probe (W135) ===\n');
  const required = process.env.CI_HELM_DEPLOY === 'true';
  console.log(`CI_HELM_DEPLOY=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();
  let fails = 0;

  for (const name of [
    'scripts/ci-helm-deploy-probe.ts',
    'scripts/ensure-helm-deploy-ready.sh',
    'infra/helm/HELM-POLICY.md',
    'infra/helm/erp/Chart.yaml',
    'infra/helm/erp/values.yaml',
    'infra/helm/erp/values-dev.yaml',
    'infra/helm/erp/values-staging.yaml',
    'infra/helm/erp/values-prod.yaml',
    'infra/helm/erp/templates/api-gateway.yaml',
    'infra/helm/erp/templates/analytics-service.yaml',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-helm-deploy-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references Helm probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_HELM_DEPLOY not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}
run();
