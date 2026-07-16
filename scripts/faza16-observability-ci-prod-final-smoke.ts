const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== Faza 16 Observability & CI Prod FINAL (W94) ===\n');
  const paths = [
    '/api/analytics/platform/grafana-provision/readiness',
    '/api/analytics/platform/playwright-matrix/readiness',
    '/api/analytics/platform/ci-auth-enforce-prod/readiness',
    '/api/analytics/platform/grafana-bi/readiness',
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
