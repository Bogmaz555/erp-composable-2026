/**
 * W36 — Central audit log readiness smoke (TD-013)
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== Audit Readiness Smoke (W36 / TD-013) ===\n');
  let fails = 0;

  const readiness = await fetch(`${GW}/api/analytics/platform/audit/readiness`, {
    signal: AbortSignal.timeout(12000),
  });
  if (!readiness.ok) {
    console.log(`✗ platform/audit/readiness → ${readiness.status}`);
    process.exit(1);
  }
  const body = await readiness.json();
  console.log(`✓ ready=${body.ready} td013=${body.td013} total=${body.total} compliance=${body.byCategory?.compliance ?? 0}`);

  if (!body.ready) fails++;
  if (body.td013 !== 'yellow-minimum') fails++;
  if (!Array.isArray(body.structuredFields) || body.structuredFields.length < 5) fails++;

  const audit = await fetch(`${GW}/api/analytics/audit?complianceOnly=true&take=10`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!audit.ok) {
    console.log(`✗ audit?complianceOnly → ${audit.status}`);
    fails++;
  } else {
    const a = await audit.json();
    const structured = (a.entries ?? []).every(
      (e: { category?: string; action?: string }) => e.category && e.action,
    );
    console.log(`✓ compliance entries=${a.count} structured=${structured}`);
    if (!structured && (a.entries ?? []).length > 0) fails++;
  }

  const summary = await fetch(`${GW}/api/analytics/platform/audit/summary`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!summary.ok) {
    console.log(`✗ platform/audit/summary → ${summary.status}`);
    fails++;
  } else {
    const s = await summary.json();
    console.log(`✓ summary total=${s.total} categories=${JSON.stringify(s.byCategory)}`);
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
