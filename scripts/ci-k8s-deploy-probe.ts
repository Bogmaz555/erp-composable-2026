/**
 * W131 — CI K8s deploy probe (mandatory when CI_K8S_DEPLOY=true)
 */
async function run() {
  console.log('=== CI K8s Deploy Probe (W131) ===\n');
  const required = process.env.CI_K8S_DEPLOY === 'true';
  console.log(`CI_K8S_DEPLOY=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();
  let fails = 0;

  for (const name of [
    'scripts/ci-k8s-deploy-probe.ts',
    'scripts/ensure-k8s-deploy-ready.sh',
    'infra/k8s/DEPLOY-POLICY.md',
    'infra/k8s/deploy/kustomization.yaml',
    'infra/k8s/deploy/api-gateway.yaml',
    'infra/k8s/deploy/analytics-service.yaml',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-k8s-deploy-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references K8s probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_K8S_DEPLOY not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}
run();
