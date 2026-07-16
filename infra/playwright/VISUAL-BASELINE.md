# Playwright Visual Regression Baseline (W132)

- **Spec:** `e2e/visual-baseline.spec.ts`
- **Snapshots:** `e2e/visual-baseline/` (Playwright snapshotPathTemplate)
- **Threshold:** `maxDiffPixelRatio: 0.05`
- **CI job:** `playwright-visual-baseline` (mandatory, no continue-on-error)
- **Update baselines:** `npx playwright test e2e/visual-baseline.spec.ts --update-snapshots`

Pages covered: home, finance, pm (core ERP shell).
