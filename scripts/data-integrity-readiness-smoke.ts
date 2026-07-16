const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== Data Integrity Smoke (W59) ===\n');
  const res = await fetch(`${GW}/api/analytics/platform/data-integrity/readiness`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) { console.log(`✗ ${res.status}`); process.exit(1); }
  const body = await res.json();
  console.log(`✓ ready=${body.ready} noMocks=${body.financeNoMocks} costLive=${body.costSummaryLive}`);
  process.exit(body.ready && body.financeNoMocks ? 0 : 1);
}
run();
