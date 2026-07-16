/**
 * W46 — Genealogy E2E view smoke (TD-004 UI spine)
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
const H = { 'X-Tenant-Id': 'default' };
const SERIAL = 'SN-MACHINE-ETO-001';

async function run() {
  console.log('=== Genealogy E2E View Smoke (W46) ===\n');
  let fails = 0;

  let res = await fetch(
    `${GW}/api/analytics/traceability/e2e/view?serialOrLot=${encodeURIComponent(SERIAL)}`,
    { headers: H, signal: AbortSignal.timeout(15000) },
  );
  if (!res.ok) {
    console.log(`✗ traceability/e2e/view → ${res.status}`);
    process.exit(1);
  }
  let body = await res.json();

  if (!body.ready || body.stagesPassed < 3) {
    console.log('Seeding demo genealogy...');
    await fetch(`${GW}/api/analytics/traceability/seed-demo`, {
      method: 'POST',
      headers: H,
      signal: AbortSignal.timeout(15000),
    }).catch(() => null);
    res = await fetch(
      `${GW}/api/analytics/traceability/e2e/view?serialOrLot=${encodeURIComponent(SERIAL)}`,
      { headers: H, signal: AbortSignal.timeout(15000) },
    );
    body = res.ok ? await res.json() : body;
  }

  console.log(
    `✓ ready=${body.ready} td004=${body.td004} stages=${body.stagesPassed}/${body.stagesTotal} spine=${body.spineComplete}`,
  );
  for (const s of body.stages ?? []) {
    console.log(`  ${s.ok ? '✓' : '✗'} ${s.domain} ${s.label} → ${s.status}`);
  }

  if (!body.ready && body.stagesPassed < 3) fails++;
  if (!body.stages || body.stages.length < 5) fails++;
  if (!['yellow-minimum', 'partial'].includes(body.td004)) fails++;

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
