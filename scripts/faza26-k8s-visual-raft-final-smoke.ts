const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
async function run() {
  console.log('=== Faza 26 K8s Visual Raft FINAL (W134) ===\n');
  const paths = [
    '/api/analytics/platform/k8s-deploy/readiness',
    '/api/analytics/platform/playwright-visual/readiness',
    '/api/analytics/platform/vault-raft/readiness',
    '/api/analytics/platform/prod-observability/readiness',
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
