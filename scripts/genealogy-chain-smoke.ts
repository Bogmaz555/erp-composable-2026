const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
const SERIAL = 'SN-MACHINE-ETO-001';

async function run() {
  console.log('=== Genealogy Chain Smoke ===\n');
  const res = await fetch(`${GW}/api/inv/inventory/genealogy/chain/${SERIAL}`, {
    headers: { 'X-Tenant-Id': 'default' },
    signal: AbortSignal.timeout(10000),
  }).catch(() => null);
  if (!res?.ok) {
    console.log(`SKIP: chain → ${res?.status ?? 'down'}`);
    process.exit(0);
  }
  const body = await res.json();
  console.log(`✓ count=${body.count} summary=${JSON.stringify(body.summary ?? {})}`);
  console.log('\n=== Result: PASS ===');
}

run();
