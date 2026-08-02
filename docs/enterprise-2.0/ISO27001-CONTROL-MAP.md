# ISO 27001 control map (lightweight)

| Theme | Control area | Evidence in repo |
|-------|--------------|------------------|
| A.5 | Policies | ADR-008, ENTERPRISE-2.0-PLAN |
| A.8 | Asset mgmt | MDM-SOR-MAP, SBOM script |
| A.8.24 | Secrets | Variant B, ci-no-secrets |
| A.8.15 | Logging | gateway/request logs, otel hooks |
| A.8.13 | Backup | backup-dbs, dr-drill |
| A.8.16 | Monitoring | Grafana/Prometheus infra |
| A.5.15 | Access | Keycloak, RBAC, JWT iss/aud |
| A.8.9 | Config | enterprise.env.example, Helm values |
