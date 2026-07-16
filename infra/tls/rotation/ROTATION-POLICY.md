# TLS Certificate Rotation Policy (W113)

- **Dev TLS** (`infra/tls/dev/`): rotate every 90 days via `scripts/rotate-tls-certs.sh`
- **mTLS** (`infra/tls/mtls/`): rotate CA + server + client certs together
- **Automation**: `scripts/ensure-tls-rotation-ready.sh` checks expiry and regenerates when < 30 days remain
- **Gateway reload**: restart api-gateway after rotation (`GATEWAY_MTLS=true`)
