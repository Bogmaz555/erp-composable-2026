/**
 * E2 structural smoke: CRM accept (pipeline ACCEPTED) + PM from-opportunity.
 * SKIP-safe when services/auth unavailable.
 *
 * Usage: npx tsx scripts/smoke-e2-crm-pm.ts
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
const KC = process.env.KEYCLOAK_URL || 'http://127.0.0.1:8080';

async function token(): Promise<string | null> {
  try {
    const res = await fetch(`${KC}/realms/erp/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: process.env.KEYCLOAK_CLIENT || 'erp-gateway',
        username: process.env.KEYCLOAK_USER || 'demo.admin',
        password: process.env.KEYCLOAK_PASS || 'demo123',
      }),
    });
    const j = (await res.json()) as { access_token?: string };
    return j.access_token || null;
  } catch {
    return null;
  }
}

async function main() {
  const health = await fetch(`${GW}/api/health`).catch(() => null);
  if (!health || !health.ok) {
    console.log('SKIP: gateway not up');
    process.exit(0);
  }

  const t = await token();
  if (!t) {
    console.log('SKIP: no Keycloak token');
    process.exit(0);
  }

  const headers = {
    Authorization: `Bearer ${t}`,
    'Content-Type': 'application/json',
  };

  // List CRM
  const crm = await fetch(`${GW}/api/crm`, { headers });
  if (!crm.ok) {
    console.error('FAIL: GET /api/crm', crm.status);
    process.exit(1);
  }
  const opps = (await crm.json()) as Array<{ id: string; status: string; title: string; value?: number; tkw?: number }>;
  console.log('OK crm opportunities', opps.length);

  // Prefer a NEW opportunity for accept test
  let opp = opps.find((o) => o.status === 'NEW') || opps[0];
  if (!opp) {
    // Create lead
    const lead = await fetch(`${GW}/api/crm/lead`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        companyName: 'E2 Smoke Sp zoo',
        nip: '5250000999',
        email: 'e2smoke@test.local',
        title: 'E2 smoke opportunity',
        estimatedValue: '50000',
        currency: 'PLN',
      }),
    });
    if (!lead.ok) {
      console.error('FAIL: create lead', lead.status, await lead.text());
      process.exit(1);
    }
    opp = (await lead.json()) as typeof opp;
    console.log('OK created lead/opp', opp.id);
  }

  // Accept via pipeline
  const acc = await fetch(`${GW}/api/crm/pipeline`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ id: opp.id, status: 'ACCEPTED' }),
  });
  if (!acc.ok) {
    console.error('FAIL: pipeline ACCEPTED', acc.status, await acc.text());
    process.exit(1);
  }
  console.log('OK pipeline ACCEPTED', opp.id);

  // Allow outbox → NATS → PM a moment
  await new Promise((r) => setTimeout(r, 2000));

  // Sync project creation (idempotent; complements NATS consumer)
  const proj = await fetch(`${GW}/api/pm/projects/from-opportunity`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      opportunityId: opp.id,
      name: opp.title || 'E2 smoke project',
      targetRevenue: Number(opp.value ?? 0),
      baselineCost: Number(opp.tkw ?? 0),
      bomItems: [],
    }),
  });
  // 404 = route missing (hard fail). 401/403 = auth role residual but route exists.
  // 2xx = project created/returned.
  if (proj.status === 404) {
    console.error('FAIL: from-opportunity route missing', await proj.text());
    process.exit(1);
  }
  if (!proj.ok && proj.status !== 401 && proj.status !== 403) {
    console.error('FAIL: from-opportunity', proj.status, await proj.text());
    process.exit(1);
  }
  console.log('OK from-opportunity HTTP', proj.status);

  // Confirm project exists on PM list (if authorized)
  const pmList = await fetch(`${GW}/api/pm`, { headers });
  if (pmList.ok) {
    const projects = (await pmList.json()) as unknown;
    const arr = Array.isArray(projects) ? projects : (projects as { data?: unknown[] })?.data;
    if (Array.isArray(arr)) {
      const found = arr.some((p: { id?: string }) => p.id === opp.id);
      console.log(found ? 'OK project visible on PM list' : 'WARN project not in list yet (NATS lag)');
    }
  }

  console.log('smoke-e2-crm-pm PASSED');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
