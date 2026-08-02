# UAT ETO week checklist (P4)

Without CLI — UI/API only:

1. [ ] Login Keycloak (engineer)
2. [ ] Open `/eto-week`
3. [ ] PLM items/BOM visible
4. [ ] PM project list with token
5. [ ] INV inventory not 401
6. [ ] MES health <500
7. [ ] Finance health 200
8. [ ] Global search ⌘K with roles
9. [ ] Document create via DMS API (optional)

Automated baseline: `playwright test e2e/pilot-eto-complete.spec.ts` (12/12)
