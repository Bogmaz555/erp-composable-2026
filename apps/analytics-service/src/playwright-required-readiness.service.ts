import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PlaywrightRequiredReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-playwright-required-probe.ts'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  }

  async getReadiness() {
    const root = this.findRepoRoot();
    const probeScript = fs.existsSync(path.join(root, 'scripts/ci-playwright-required-probe.ts'));
    const bootScript = fs.existsSync(path.join(root, 'scripts/ci-playwright-stack-boot.sh'));

    let workflowRequiredJob = false;
    let workflowNoContinueOnError = false;
    try {
      const workflow = fs.readFileSync(path.join(root, '.github/workflows/erp-ci.yml'), 'utf8');
      workflowRequiredJob = workflow.includes('playwright-pm-bi-required');
      const block = workflow.split('playwright-pm-bi-required:')[1]?.split('\n  playwright:')[0] ?? '';
      workflowNoContinueOnError = workflowRequiredJob && !block.includes('continue-on-error: true');
    } catch {
      workflowRequiredJob = false;
    }

    let ciGateIncludesProbe = false;
    try {
      const gate = fs.readFileSync(path.join(root, 'scripts/ci-contract-gate.sh'), 'utf8');
      ciGateIncludesProbe = gate.includes('ci-playwright-required-probe');
    } catch {
      ciGateIncludesProbe = false;
    }

    const ciPlaywrightRequired = process.env.CI_PLAYWRIGHT_REQUIRED === 'true';
    const ready =
      probeScript && bootScript && workflowRequiredJob && workflowNoContinueOnError && ciGateIncludesProbe;

    return {
      ready,
      td012: ready ? 'yellow-minimum' : workflowRequiredJob ? 'partial' : 'down',
      domain: 'PLAYWRIGHT_REQUIRED',
      probeScript,
      bootScript,
      workflowRequiredJob,
      workflowNoContinueOnError,
      ciGateIncludesProbe,
      ciPlaywrightRequiredEnv: ciPlaywrightRequired,
      capabilities: ['required Playwright PM BI job', 'no continue-on-error', 'stack boot script'],
      checkedAt: new Date().toISOString(),
    };
  }
}
