#!/usr/bin/env npx tsx
/**
 * Temporal Bridge Worker — polls bridge status, runs bridge cycles on interval
 * Usage:
 *   npx tsx scripts/temporal-bridge-worker.ts --once
 *   npx tsx scripts/temporal-bridge-worker.ts --loop --interval 30
 */
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
const H = { 'Content-Type': 'application/json', 'X-Tenant-Id': 'default' };

const args = process.argv.slice(2);
const once = args.includes('--once');
const loop = args.includes('--loop');
const intervalIdx = args.indexOf('--interval');
const intervalSec = intervalIdx >= 0 ? parseInt(args[intervalIdx + 1] || '30', 10) : 30;

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] [temporal-bridge] ${msg}`);
}

async function cycle() {
  const stRes = await fetch(`${GW}/api/analytics/eto-chain/temporal/status`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!stRes.ok) {
    log(`SKIP status ${stRes.status}`);
    return false;
  }
  const st = await stRes.json();
  log(`mode=${st.mode} temporal=${st.temporalReachable} cycles=${st.bridgeCycles}`);

  const cid = `tbridge-worker-${Date.now()}`;
  const runRes = await fetch(`${GW}/api/analytics/eto-chain/temporal/bridge-run`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ correlationId: cid }),
    signal: AbortSignal.timeout(20000),
  });
  if (!runRes.ok) {
    log(`FAIL bridge-run ${runRes.status}`);
    return false;
  }
  const body = await runRes.json();
  log(`OK published ${body.stepsPublished}/${body.totalSteps} (${body.mode})`);
  return true;
}

async function main() {
  log('worker start');
  if (once || !loop) {
    await cycle();
    return;
  }
  for (;;) {
    try {
      await cycle();
    } catch (e) {
      log(`error: ${(e as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, intervalSec * 1000));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
