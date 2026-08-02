# KSeF production runbook (Enterprise Q2)

## Modes

| `KSEF_MODE` | Behavior | Gate default |
|-------------|----------|--------------|
| `sandbox` (default) | `KsefSandboxService` mock / sandbox URL | Yes |
| `production` | `KsefProductionService` live FA(3) API | No — opt-in |

## Required env (production only)

Secrets **never** in git. Load from env or Vault.

| Variable | Required | Notes |
|----------|----------|-------|
| `KSEF_API_URL` | yes | Ministry / provider base URL |
| `KSEF_TOKEN` | yes | Bearer token |
| `KSEF_CERT_PATH` | optional | mTLS / signing cert path on volume |
| `ENTERPRISE` / `ERP_PROFILE=enterprise` | for fail-closed boot | tax-legal refuses boot if production + missing |

## Fail-closed

1. **Boot** (`assertKsefEnterpriseBoot`): when ENTERPRISE + `KSEF_MODE=production` and missing URL/token → process exit (throw before listen).
2. **Send** (`KsefProductionService.assertConfigured`): throws if send attempted without config.
3. **Status** (`GET /tax-legal/ksef/status`): reports `ready: false`, `failClosed: true` when production misconfigured.

## Ops checklist

1. Keep `KSEF_MODE=sandbox` for CI and pilot smoke.
2. For production: inject secrets via Vault/k8s Secret; set `KSEF_MODE=production`.
3. Verify `GET /tax-legal/ksef/production/profile` → `profileReady: true`.
4. Probe readiness panel: `GET /api/analytics/platform/ksef-prod/readiness`.
5. On send failure: compensation matrix `tax.invoice.ksef.sent.v1` → `finance.revenue.reversed.v1`.

## Evidence pack

- FA schema: FA(3)
- Router + production service unit/boot tests
- `scripts/ci-ksef-prod-probe.ts` (file/infra, not live Ministry API)
- This runbook under `docs/enterprise-2.0/`
