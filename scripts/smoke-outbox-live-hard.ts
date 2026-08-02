/**
 * K1 hard: insert PENDING outbox in INV (and optionally PROC), wait for PROCESSED.
 * Requires relay running + DB. Fail on REQUIRE_LIVE if not PROCESSED in timeout.
 */
import { randomUUID } from 'crypto';

const INV_DB =
  process.env.INV_DATABASE_URL ||
  process.env.INVENTORY_DATABASE_URL ||
  'postgresql://erp_user:erp_password@localhost:5436/inv_db';
const TIMEOUT_MS = Number(process.env.OUTBOX_LIVE_TIMEOUT_MS || 15000);
const REQUIRE =
  process.env.REQUIRE_LIVE === '1' || process.env.REQUIRE_LIVE_STRICT === '1';

async function main() {
  const { Client } = await import('pg');
  const client = new Client({ connectionString: INV_DB });
  await client.connect();
  const id = randomUUID();
  const eventType = 'inventory.reservation.created.v1';
  try {
    await client.query(
      `INSERT INTO "OutboxEvent" (id, "tenantId", "aggregateId", "aggregateType", "eventType", payload, status, attempts, "createdAt")
       VALUES ($1, 'default', $2, 'Reservation', $3, $4::jsonb, 'PENDING', 0, NOW())`,
      [id, `agg-${id.slice(0, 8)}`, eventType, JSON.stringify({ smoke: true, id, tenantId: 'default' })],
    );
    console.log(`✓ inserted PENDING outbox ${id}`);
    const start = Date.now();
    let status = 'PENDING';
    while (Date.now() - start < TIMEOUT_MS) {
      const r = await client.query(`SELECT status::text FROM "OutboxEvent" WHERE id=$1`, [id]);
      status = r.rows[0]?.status || 'MISSING';
      if (status === 'PROCESSED' || status === 'FAILED') break;
      await new Promise((x) => setTimeout(x, 500));
    }
    if (status === 'PROCESSED') {
      console.log(`✓ outbox PROCESSED within ${Date.now() - start}ms`);
      process.exit(0);
    }
    console.log(`✗ outbox status=${status} after ${TIMEOUT_MS}ms`);
    process.exit(REQUIRE ? 1 : 0);
  } finally {
    await client.end();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
