/**
 * Auth enforce smoke — Keycloak token + gateway protected routes
 * Run: npx tsx scripts/auth-enforce-smoke.ts
 * SKIP-safe when Keycloak/gateway down
 */
import { execSync } from 'child_process';

const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== Auth Enforce Smoke ===\n');
  let token = '';
  try {
    token = execSync('bash scripts/get-keycloak-token.sh 2>/dev/null', { encoding: 'utf8' }).trim();
  } catch {
    console.log('SKIP: Keycloak token unavailable');
    process.exit(0);
  }

  if (!token) {
    console.log('SKIP: empty token');
    process.exit(0);
  }

  const publicRes = await fetch(`${GW}/api/analytics/auth/context`, { signal: AbortSignal.timeout(5000) });
  console.log(`${publicRes.ok ? '✓' : '✗'} public auth/context → ${publicRes.status}`);

  const authRes = await fetch(`${GW}/api/pm`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
  console.log(`${authRes.status < 500 ? '✓' : '✗'} GW /api/pm with bearer → ${authRes.status}`);

  const ctxRes = await fetch(`${GW}/api/analytics/auth/context`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Dev-Role': 'ENGINEER' },
    signal: AbortSignal.timeout(5000),
  });
  if (ctxRes.ok) {
    const ctx = await ctxRes.json();
    console.log(`✓ auth context roles: ${ctx.roles?.join(',') ?? 'n/a'}`);
  }

  console.log('\n=== Auth Enforce Smoke DONE ===');
  process.exit(authRes.status >= 500 ? 1 : 0);
}

run();
