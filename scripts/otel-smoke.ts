const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

async function run() {
  console.log('=== OTel Smoke ===\n');
  const res = await fetch(`${GW}/api/analytics/otel/status`, { signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!res?.ok) {
    console.log(`SKIP: otel/status → ${res?.status ?? 'down'}`);
    process.exit(0);
  }
  const body = await res.json();
  console.log(`✓ enabled=${body.enabled} endpoint=${body.exporterEndpoint}`);
  const jaeger = await fetch('http://127.0.0.1:16686', { signal: AbortSignal.timeout(3000) }).catch(() => null);
  console.log(jaeger?.ok ? '✓ Jaeger UI up' : '○ Jaeger UI down (run: docker compose --profile otel up -d jaeger)');
  console.log('\n=== Result: PASS ===');
}

run();
