# First-tenant cutover runbook (GA-lite)

1. Provision dedicated stack (DEDICATED_STACK)
2. Inject secrets per SECRETS-CONTRACT (Vault/K8s)
3. Helm values-prod: ENTERPRISE=1, NATS_JETSTREAM=true
4. Migrate DBs (migrate deploy, not db push)
5. boot-enterprise / k8s roll
6. health-matrix PASS
7. smoke:pilot + e2e 12/12
8. DR dry-run evidence updated
9. Set STATUS `GA_LITE_SIGNED=true` after human sign-off
10. Tag enterprise-2.1.0
