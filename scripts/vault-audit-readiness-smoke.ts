const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== Vault Audit Readiness Smoke (W125) ===\n');
  const res = await fetch(`${GW}/api/analytics/platform/vault-audit/readiness`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    console.log(`✗ ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log(`✓ ready=${body.ready} auditPolicy=${body.auditPolicy}`);
  process.exit(body.ready ? 0 : 1);
}
run();
