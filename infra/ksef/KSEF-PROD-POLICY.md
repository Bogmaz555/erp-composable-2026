# KSeF Production Profile (W141)

## Required env (production mode)

| Variable | Description |
|----------|-------------|
| `KSEF_MODE` | Must be `production` |
| `KSEF_API_URL` | KSeF 2.0 API endpoint |
| `KSEF_TOKEN` | Bearer token / cert reference |

## Endpoints

- `GET /ksef/status` — router status (sandbox or production)
- `GET /ksef/production/profile` — production profile readiness

## CI Gate

`CI_KSEF_PROD=true` → `scripts/ci-ksef-prod-probe.ts` (file/infra checks only; live API optional)

## Docker profile

`docker compose --profile ksef-prod up -d tax-legal` (env-gated stub)
