const GW = process.env.GW_URL || 'http://127.0.0.1:4005';
async function main() {
  const res = await fetch(`${GW}/api/analytics/platform/tenant-hardening/readiness`, {
    signal: AbortSignal.timeout(15000),
  });
  const body = await res.json();
  console.log('tenant-hardening readiness:', res.status, body.ready ?? body);
  process.exit(res.ok ? 0 : 1);
}
main();
