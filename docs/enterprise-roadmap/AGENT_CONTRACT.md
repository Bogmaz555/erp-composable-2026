# Enterprise Roadmap — Agent Contract

1. **ZERO confirmation pauses.**
2. Read `docs/ENTERPRISE-ROADMAP-STATUS.md` then `NEXT_AGENT_PROMPT.md`.
3. One milestone/phase per advance cycle: DESIGN → IMPLEMENT → GATE → RELEASE.
4. Do not reset Enterprise 2.0 / 2.1 DONE programs.
5. After work: update STATUS, commit, push, `pnpm run enterprise-roadmap:step`.
6. Leave workspace on **master** after RESUME.
7. Hard stops: force-push master; filter-repo without APPROVED_BY_USER_A; secrets in git; live DR outside erp-pilot-dr; AUTH_ENFORCE=false as enterprise default; readiness theater.
8. E4 multi-tenant only if `tenancy: SHARED_RLS` + ADR; else DEFER and DONE after E3.
