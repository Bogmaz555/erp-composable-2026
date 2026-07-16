const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== Vault KMS Unseal Readiness Smoke (W121) ===\n');
  const res = await fetch(`${GW}/api/analytics/platform/vault-kms-unseal/readiness`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    console.log(`✗ ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log(`✓ ready=${body.ready} kmsConfig=${body.kmsConfig}`);
  process.exit(body.ready ? 0 : 1);
}
run();
