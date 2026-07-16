const GW = process.env.GW_URL || 'http://127.0.0.1:4005';
const paths = [
  '/api/analytics/platform/helm-deploy/readiness',
  '/api/analytics/platform/playwright-visual-diff/readiness',
  '/api/analytics/platform/quality-eam-prod/readiness',
];
async function main() {
  let fails = 0;
  for (const p of paths) {
    const res = await fetch(`${GW}${p}`, { signal: AbortSignal.timeout(15000) });
    const body = await res.json();
    console.log(p, res.status, body.domain ?? body.ready);
    if (!res.ok) fails++;
  }
  process.exit(fails > 0 ? 1 : 0);
}
main();
