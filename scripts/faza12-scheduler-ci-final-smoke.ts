const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== Faza 12 Scheduler & CI Auth FINAL (W78) ===\n');
  const paths = [
    '/api/analytics/platform/bi-scheduler/readiness',
    '/api/analytics/platform/pm-e2e/readiness',
    '/api/analytics/platform/ci-auth-enforce/readiness',
    '/api/analytics/platform/frontend-bi/readiness',
  ];
  let fails = 0;
  for (const path of paths) {
    const res = await fetch(`${GW}${path}`, { signal: AbortSignal.timeout(20000) });
    const body = res.ok ? await res.json() : null;
    const ready = body && (body as { ready?: boolean }).ready;
    console.log(`✓ ${path.split('/').slice(-2).join('/')} → ready=${ready}`);
    if (!res.ok || !ready) fails++;
  }
  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}
run();
