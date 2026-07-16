import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PlaywrightVisualReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-playwright-visual-probe.ts'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  }

  async getReadiness() {
    const root = this.findRepoRoot();
    const visualSpec = fs.existsSync(path.join(root, 'e2e/visual-baseline.spec.ts'));
    const policy = fs.existsSync(path.join(root, 'infra/playwright/VISUAL-BASELINE.md'));
    const probeScript = fs.existsSync(path.join(root, 'scripts/ci-playwright-visual-probe.ts'));
    const snapshotDir = fs.existsSync(path.join(root, 'e2e/visual-baseline'));

    let playwrightConfigVisual = false;
    try {
      const cfg = fs.readFileSync(path.join(root, 'playwright.config.ts'), 'utf8');
      playwrightConfigVisual =
        cfg.includes('snapshotPathTemplate') && cfg.includes('toHaveScreenshot');
    } catch {
      playwrightConfigVisual = false;
    }

    let workflowVisualJob = false;
    let workflowNoContinueOnError = false;
    try {
      const wf = fs.readFileSync(path.join(root, '.github/workflows/erp-ci.yml'), 'utf8');
      workflowVisualJob = wf.includes('playwright-visual-baseline');
      const block = wf.split('playwright-visual-baseline:')[1]?.split('\n  playwright:')[0] ?? '';
      workflowNoContinueOnError = workflowVisualJob && !block.includes('continue-on-error: true');
    } catch {
      workflowVisualJob = false;
    }

    let ciGateIncludesProbe = false;
    try {
      const gate = fs.readFileSync(path.join(root, 'scripts/ci-contract-gate.sh'), 'utf8');
      ciGateIncludesProbe = gate.includes('ci-playwright-visual-probe');
    } catch {
      ciGateIncludesProbe = false;
    }

    const ready =
      visualSpec &&
      policy &&
      probeScript &&
      snapshotDir &&
      playwrightConfigVisual &&
      workflowVisualJob &&
      workflowNoContinueOnError &&
      ciGateIncludesProbe;

    return {
      ready,
      td012: ready ? 'yellow-minimum' : visualSpec ? 'partial' : 'down',
      domain: 'PLAYWRIGHT_VISUAL',
      visualSpec,
      policy,
      probeScript,
      snapshotDir,
      playwrightConfigVisual,
      workflowVisualJob,
      workflowNoContinueOnError,
      ciGateIncludesProbe,
      ciPlaywrightVisualEnv: process.env.CI_PLAYWRIGHT_VISUAL === 'true',
      capabilities: ['Visual regression baseline', 'Screenshot snapshots', 'maxDiffPixelRatio 0.05'],
      checkedAt: new Date().toISOString(),
    };
  }
}
