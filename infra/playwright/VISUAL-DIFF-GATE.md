# Playwright Visual Diff Gate (W136)

## Policy

Visual regression runs in **strict diff mode** — no `--update-snapshots` fallback in CI.

## Requirements

1. Baseline snapshots committed under `e2e/visual-baseline/`
2. CI job `playwright-visual-diff` runs tests without update flag
3. `CI_PLAYWRIGHT_VISUAL_DIFF=true` enables mandatory probe

## Local update (dev only)

```bash
FRONTEND_URL=http://127.0.0.1:3001 PW_SKIP_SERVER=1 \
  npx playwright test e2e/visual-baseline.spec.ts --update-snapshots
```
