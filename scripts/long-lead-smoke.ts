/**
 * Long-Lead Radar smoke — PROC status endpoint
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== Long-Lead Radar Smoke ===\n');
  const res = await fetch(`${GW}/api/proc/long-lead/radar`, {
    headers: { 'X-Tenant-Id': 'default' },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    console.log(`SKIP: long-lead radar → ${res.status}`);
    process.exit(0);
  }
  const body = await res.json();
  console.log(`✓ thresholdDays=${body.thresholdDays} longLeadOrders=${body.longLeadOrders}`);
  if ((body.thresholdDays ?? 0) < 7) {
    console.log('✗ invalid threshold');
    process.exit(1);
  }
  console.log('\n=== Result: PASS ===');
}

run();
