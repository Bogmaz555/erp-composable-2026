# Helm umbrella notes (Enterprise Q5)

Chart: `infra/helm/erp`

## Deploy order
1. namespaces + secrets (Keycloak, Meili, DB URLs)
2. NATS / Redis
3. databases (or external)
4. domain services + gateway
5. NetworkPolicy (Q3) + HPA/PDB

## Air-gap
- Pre-pull images listed in values
- Offline `pnpm fetch` + vendor node_modules if required
- Meili/Keycloak images mirrored internally
