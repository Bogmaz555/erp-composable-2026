/**
 * W139 — CI K8s extended probe (mandatory when CI_K8S_EXTENDED=true)
 */
async function run() {
  console.log('=== CI K8s Extended Probe (W139) ===\n');
  const required = process.env.CI_K8S_EXTENDED === 'true';
  console.log(`CI_K8S_EXTENDED=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();
  let fails = 0;

  for (const name of [
    'scripts/ci-k8s-extended-probe.ts',
    'scripts/ensure-k8s-extended-ready.sh',
    'infra/k8s/K8S-EXTENDED-POLICY.md',
    'infra/k8s/deploy/kustomization.yaml',
    'infra/k8s/deploy/pm-service.yaml',
    'infra/k8s/deploy/plm-service.yaml',
    'infra/k8s/deploy/finance-service.yaml',
    'infra/k8s/deploy/quality-service.yaml',
    'infra/k8s/deploy/eam-service.yaml',
    'infra/k8s/deploy/proc-service.yaml',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const kust = fs.readFileSync(path.join(ROOT, 'infra/k8s/deploy/kustomization.yaml'), 'utf8');
    const kustOk =
      kust.includes('pm-service') &&
      kust.includes('finance-service') &&
      kust.includes('proc-service');
    console.log(`${kustOk ? '✓' : '✗'} kustomization includes extended services`);
    if (!kustOk) fails++;
  } catch {
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-k8s-extended-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references K8s extended probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_K8S_EXTENDED not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}
run();
