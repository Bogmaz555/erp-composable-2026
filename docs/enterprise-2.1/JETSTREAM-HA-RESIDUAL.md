# JetStream HA residual (P2)

- Single-node `erp-nats` is default pilot/staging.
- HA path: `infra/nats/HA.md` + `docker-compose.nats-ha.yml`.
- Production: either enable 3-node cluster **or** accept residual with this sign-off until funded.
- Status: **documented residual** — not blocking P2 tag if dry-run DR green.

## E1 decision (2026-08-03)

| Choice | **Accept single-node JetStream** for pilot / first dedicated prod window |
|--------|--------------------------------------------------------------------------|
| Until | **2026-11-01** re-review or when multi-AZ SLA is sold |
| Path when funded | `infra/nats/HA.md` + `docker-compose.nats-ha.yml` 3-node |
| Signed residual | Yes — E1 production hardening (enterprise-roadmap) |
