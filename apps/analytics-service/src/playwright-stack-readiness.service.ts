import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PlaywrightStackReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-playwright-stack-boot.sh'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  }

  async getReadiness() {
    const root = this.findRepoRoot();
    const bootScript = fs.existsSync(path.join(root, 'scripts/ci-playwright-stack-boot.sh'));
    const probeScript = fs.existsSync(path.join(root, 'scripts/ci-playwright-stack-probe.ts'));
    const specExists = fs.existsSync(path.join(root, 'e2e/pm-bi-panel.spec.ts'));

    let workflowIncludesStack = false;
    let workflowRequiredJob = false;
    try {
      const workflow = fs.readFileSync(path.join(root, '.github/workflows/erp-ci.yml'), 'utf8');
      workflowIncludesStack =
        workflow.includes('ci-playwright-stack-boot') && workflow.includes('ci-playwright-stack-probe');
      workflowRequiredJob = workflow.includes('playwright-pm-bi-required') || workflow.includes('Playwright PM BI');
    } catch {
      workflowIncludesStack = false;
    }

    let ciGateIncludesProbe = false;
    try {
      const gate = fs.readFileSync(path.join(root, 'scripts/ci-contract-gate.sh'), 'utf8');
      ciGateIncludesProbe = gate.includes('ci-playwright-stack-probe');
    } catch {
      ciGateIncludesProbe = false;
    }

    const ciPlaywrightStack = process.env.CI_PLAYWRIGHT_STACK === 'true';
    const ready = bootScript && probeScript && specExists && workflowIncludesStack && ciGateIncludesProbe;

    return {
      ready,
      td012: ready ? 'yellow-minimum' : bootScript ? 'partial' : 'down',
      domain: 'PLAYWRIGHT_STACK',
      bootScript,
      probeScript,
      specExists,
      workflowIncludesStack,
      workflowRequiredJob,
      ciGateIncludesProbe,
      ciPlaywrightStackEnv: ciPlaywrightStack,
      capabilities: ['CI stack boot script', 'required Playwright PM BI job', 'stack probe in gate'],
      checkedAt: new Date().toISOString(),
    };
  }
}
