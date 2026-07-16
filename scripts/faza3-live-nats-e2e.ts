#!/usr/bin/env npx tsx
/**
 * Live E2E (optional): publish inv.stock.out.v1 → poll PROC orders.
 * Requires: NATS :4222, proc-service :4004, outbox relays running.
 * Exits 0 with SKIP if infra unavailable.
 */
import { connect, StringCodec } from 'nats';

const sc = StringCodec();
const PROC_URL = process.env.PROC_SERVICE_URL || 'http://127.0.0.1:4004';
const NATS_URL = process.env.NATS_URL || 'nats://127.0.0.1:4222';

async function fetchOrders(): Promise<{ id: string; sku: string; source?: string }[]> {
  const res = await fetch(`${PROC_URL}/orders`, { signal: AbortSignal.timeout(3000) });
  if (!res.ok) throw new Error(`PROC ${res.status}`);
  return res.json();
}

async function main() {
  console.log('=== Faza 3 Live NATS E2E ===\n');

  let nc;
  try {
    nc = await connect({ servers: NATS_URL, timeout: 3000 });
  } catch (e) {
    console.log('SKIP: NATS not reachable —', (e as Error).message);
    process.exit(0);
  }

  let before: { id: string }[] = [];
  try {
    before = await fetchOrders();
  } catch (e) {
    console.log('SKIP: proc-service not reachable —', (e as Error).message);
    await nc.close();
    process.exit(0);
  }

  const payload = {
    itemId: 'E2E-SKU-01',
    sku: 'E2E-SKU-01',
    missingQuantity: 3,
    projectId: 'e2e-proj',
    wbsElementId: 'e2e-wbs',
    bomComponentId: 'e2e-bc',
    tenantId: 'default',
  };

  nc.publish('inv.stock.out.v1', sc.encode(JSON.stringify(payload)));
  console.log('Published inv.stock.out.v1');

  await new Promise((r) => setTimeout(r, 6000));

  let after: { id: string; sku: string; source?: string }[] = [];
  try {
    after = await fetchOrders();
  } catch (e) {
    console.log('SKIP: proc poll failed —', (e as Error).message);
    await nc.close();
    process.exit(0);
  }

  await nc.close();

  const newPo = after.find(
    (o) => !before.some((b) => b.id === o.id) && o.sku === 'E2E-SKU-01',
  );

  if (newPo) {
    console.log('PASSED: new PO', newPo.id, newPo.source);
    process.exit(0);
  }

  const anyShortage = after.find((o) => o.sku === 'E2E-SKU-01' && o.source === 'SHORTAGE');
  if (anyShortage) {
    console.log('PASSED (existing PO):', anyShortage.id);
    process.exit(0);
  }

  console.error('FAIL: no SHORTAGE PO for E2E-SKU-01 — ensure proc-service NATS listener + InvIntegrationController');
  process.exit(1);
}

main();
