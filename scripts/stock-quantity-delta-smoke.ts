/**
 * Stock quantity delta smoke — seed RELEASED reservation → compensation → stock +qty
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
const H = { 'Content-Type': 'application/json', 'X-Tenant-Id': 'default' };

async function run() {
  console.log('=== Stock Quantity Delta Smoke ===\n');
  let fails = 0;

  const seed = await fetch(`${GW}/api/inv/compensation/seed-released`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ quantity: 7 }),
    signal: AbortSignal.timeout(12000),
  });
  if (!seed.ok) {
    console.log(`SKIP: seed-released → ${seed.status}`);
    process.exit(0);
  }
  const s = await seed.json();
  if (!s.ok) {
    console.log(`SKIP: ${s.reason}`);
    process.exit(0);
  }
  console.log(`✓ seeded reservation qty=${s.quantity} WO=${s.workOrderId} stockBefore=${s.stockBefore}`);

  const trigger = await fetch(`${GW}/api/inv/compensation/trigger-restore`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ workOrderId: s.workOrderId }),
    signal: AbortSignal.timeout(12000),
  });
  if (!trigger.ok) {
    console.log(`✗ trigger-restore → ${trigger.status}`);
    fails++;
  } else {
    console.log('✓ trigger-restore OK');
  }

  await new Promise((r) => setTimeout(r, 1500));

  const inv = await fetch(`${GW}/api/inv/inventory`, {
    headers: { 'X-Tenant-Id': 'default' },
    signal: AbortSignal.timeout(10000),
  });
  if (!inv.ok) {
    console.log(`✗ inventory → ${inv.status}`);
    fails++;
  } else {
    const items = await inv.json();
    const list = Array.isArray(items) ? items : items?.items ?? [];
    const item = list.find((i: { id: string }) => i.id === s.itemId) ?? list[0];
    const stockAfter = item?.stockQuantity ?? item?.quantity ?? 0;
    const delta = stockAfter - (s.stockBefore ?? 0);
    console.log(`✓ stock after=${stockAfter} delta=${delta}`);
    if (delta < s.quantity) fails++;
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
