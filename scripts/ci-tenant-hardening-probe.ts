/**
 * W140 — CI tenant hardening probe (mandatory when CI_TENANT_HARDENING=true)
 */
async function run() {
  console.log('=== CI Tenant Hardening Probe (W140) ===\n');
  const required = process.env.CI_TENANT_HARDENING === 'true';
  console.log(`CI_TENANT_HARDENING=${required}`);

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = process.cwd();
  let fails = 0;

  for (const name of [
    'scripts/ci-tenant-hardening-probe.ts',
    'scripts/ensure-tenant-hardening-ready.sh',
    'infra/tenant/TENANT-HARDENING-POLICY.md',
    'apps/proc-service/src/tenant.middleware.ts',
    'apps/analytics-service/src/tenant-isolation.service.ts',
  ]) {
    const ok = fs.existsSync(path.join(ROOT, name));
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) fails++;
  }

  try {
    const gw = fs.readFileSync(path.join(ROOT, 'apps/api-gateway/src/main.ts'), 'utf8');
    const gwOk = gw.includes('x-tenant-id');
    console.log(`${gwOk ? '✓' : '✗'} gateway tenant header hook`);
    if (!gwOk) fails++;
  } catch {
    fails++;
  }

  try {
    const ctrl = fs.readFileSync(path.join(ROOT, 'apps/analytics-service/src/tenant.controller.ts'), 'utf8');
    const ctrlOk = ctrl.includes('tenants/hardening/check');
    console.log(`${ctrlOk ? '✓' : '✗'} hardening check endpoint`);
    if (!ctrlOk) fails++;
  } catch {
    fails++;
  }

  try {
    const gate = fs.readFileSync(path.join(ROOT, 'scripts/ci-contract-gate.sh'), 'utf8');
    const gateOk = gate.includes('ci-tenant-hardening-probe');
    console.log(`${gateOk ? '✓' : '✗'} ci-contract-gate references tenant hardening probe`);
    if (!gateOk) fails++;
  } catch {
    fails++;
  }

  if (!required) {
    console.log('\nSKIP: CI_TENANT_HARDENING not set (dev mode)');
    process.exit(0);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}
run();
