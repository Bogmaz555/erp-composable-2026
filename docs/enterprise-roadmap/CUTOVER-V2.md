# Cutover runbook v2 (E3)

## Pre-flight
1. Tag `enterprise-2.3.0`+ on release candidate  
2. `bash scripts/ci-no-secrets.sh` PASS  
3. Staging smoke:pilot green  
4. Backup all core DBs (`infra/k8s/cronjob-backup-dbs.yaml` or `scripts` dump)  
5. DR dry-run on `erp-pilot-dr`  

## Cutover
1. Freeze writes / maintenance window  
2. Final backup  
3. Deploy images + `prisma migrate deploy` per service  
4. Set ENTERPRISE=1 NATS_JETSTREAM=true AUTH_ENFORCE=true MEILI_MASTER_KEY  
5. health-matrix 8/8  
6. Smoke CRM→PM accept path (`npx tsx scripts/smoke-e2-crm-pm.ts`)  
7. Open traffic  

## Rollback
1. Redeploy previous tag  
2. Restore DB from pre-cutover backup if schema moved forward  

## Sign-off
- [ ] Operator  
- [ ] Time window recorded  
