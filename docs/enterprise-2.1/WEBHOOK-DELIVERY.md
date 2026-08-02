# Webhook delivery (P4)

- Sign: `apps/shared-kernel/src/webhook-sign.ts` (`X-ERP-Signature: sha256=...`)
- Secret: `WEBHOOK_SIGNING_SECRET` (SECRETS-CONTRACT)
- Retry: at-least-once; store delivery attempts in ops log / future table
- DLQ: after N failures, mark failed; alert optional
