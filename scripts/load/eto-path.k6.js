/**
 * Enterprise Q3 — k6 budget for ETO-adjacent gateway path.
 * Run: k6 run scripts/load/eto-path.k6.js
 * Env: GATEWAY_URL (default http://127.0.0.1:4005)
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const GW = __ENV.GATEWAY_URL || 'http://127.0.0.1:4005';

export const options = {
  vus: Number(__ENV.K6_VUS || 5),
  duration: __ENV.K6_DURATION || '30s',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<800'],
  },
};

export default function () {
  const health = http.get(`${GW}/api/health`);
  check(health, { 'gateway health 200': (r) => r.status === 200 });

  const analyticsHealth = http.get(`${GW}/api/analytics/health`);
  check(analyticsHealth, {
    'analytics health 200': (r) => r.status === 200,
  });

  // unauthenticated PM must be 401 (auth boundary budget)
  const pm = http.get(`${GW}/api/pm/projects`);
  check(pm, { 'pm without token 401': (r) => r.status === 401 });

  sleep(0.3);
}
