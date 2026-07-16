import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PlaywrightVisualDiffReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-playwright-visual-diff-probe.ts'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  }

  async getReadiness() {
    const root = this.findRepoRoot();
    const policy = fs.existsSync(path.join(root, 'infra/playwright/VISUAL-DIFF-GATE.md'));
    const probeScript = fs.existsSync(path.join(root, 'scripts/ci-playwright-visual-diff-probe.ts'));
    const visualSpec = fs.existsSync(path.join(root, 'e2e/visual-baseline.spec.ts'));
    const snapshotDir = fs.existsSync(path.join(root, 'e2e/visual-baseline'));

    let hasBaselineSnapshots = false;
    try {
      const dir = path.join(root, 'e2e/visual-baseline');
      if (fs.existsSync(dir)) {
        const walk = (d: string): boolean => {
          for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            const p = path.join(d, e.name);
            if (e.isDirectory() && walk(p)) return true;
            if (e.isFile() && e.name.endsWith('.png')) return true;
          }
          return false;
        };
        hasBaselineSnapshots = walk(dir);
      }
    } catch {
      hasBaselineSnapshots = false;
    }

    let workflowStrictDiff = false;
    let workflowNoUpdateFallback = false;
    try {
      const wf = fs.readFileSync(path.join(root, '.github/workflows/erp-ci.yml'), 'utf8');
      workflowStrictDiff = wf.includes('playwright-visual-diff');
      const block = wf.split('playwright-visual-diff:')[1]?.split('\n  playwright:')[0] ?? '';
      workflowNoUpdateFallback =
        workflowStrictDiff &&
        !block.includes('--update-snapshots') &&
        !block.includes('continue-on-error: true');
    } catch {
      workflowStrictDiff = false;
    }

    let ciGateIncludesProbe = false;
    try {
      const gate = fs.readFileSync(path.join(root, 'scripts/ci-contract-gate.sh'), 'utf8');
      ciGateIncludesProbe = gate.includes('ci-playwright-visual-diff-probe');
    } catch {
      ciGateIncludesProbe = false;
    }

    const ready =
      policy &&
      probeScript &&
      visualSpec &&
      snapshotDir &&
      hasBaselineSnapshots &&
      workflowStrictDiff &&
      workflowNoUpdateFallback &&
      ciGateIncludesProbe;

    return {
      ready,
      td012: ready ? 'yellow-minimum' : hasBaselineSnapshots ? 'partial' : 'down',
      domain: 'PLAYWRIGHT_VISUAL_DIFF',
      policy,
      probeScript,
      visualSpec,
      snapshotDir,
      hasBaselineSnapshots,
      workflowStrictDiff,
      workflowNoUpdateFallback,
      ciGateIncludesProbe,
      ciPlaywrightVisualDiffEnv: process.env.CI_PLAYWRIGHT_VISUAL_DIFF === 'true',
      capabilities: ['Strict visual diff', 'No update-snapshots fallback', 'Baseline PNG gate'],
      checkedAt: new Date().toISOString(),
    };
  }
}
