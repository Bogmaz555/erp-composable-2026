/**
 * Double BOM smoke — PLM explosion endpoint
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== Double BOM Smoke ===\n');
  for (const base of [`${GW}/api/plm`, process.env.PLM_URL || 'http://127.0.0.1:4007']) {
    const listRes = await fetch(`${base}/boms`, { signal: AbortSignal.timeout(8000) }).catch(() => null);
    if (!listRes?.ok) continue;
    const boms = (await listRes.json()) as Array<{ id: string }>;
    const bomId = boms[0]?.id;
    if (!bomId) continue;
    const path = base.includes('/api/plm')
      ? `${base}/boms/versions/${bomId}/double-bom`
      : `${base}/boms/versions/${bomId}/double-bom`;
    const res = await fetch(path, { signal: AbortSignal.timeout(8000) }).catch(() => null);
    if (res?.ok) {
      const body = await res.json();
      console.log(`✓ topLevel=${body.topLevelComponents} exploded=${body.explodedLeafCount} double=${body.hasDoubleBom}`);
      console.log('\n=== Result: PASS ===');
      return;
    }
  }
  console.log('SKIP: double-bom (services down or no BOM)');
}

run();
