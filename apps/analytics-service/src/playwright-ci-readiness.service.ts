import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PlaywrightCiReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'playwright.config.ts'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  }

  async getReadiness() {
    const root = this.findRepoRoot();
    const specPath = path.join(root, 'e2e/pm-bi-panel.spec.ts');
    const probePath = path.join(root, 'scripts/ci-playwright-pm-bi-probe.ts');
    const specExists = fs.existsSync(specPath);
    const probeExists = fs.existsSync(probePath);

    let workflowIncludesPmBi = false;
    let workflowPlaywrightJob = false;
    try {
      const workflow = fs.readFileSync(path.join(root, '.github/workflows/erp-ci.yml'), 'utf8');
      workflowIncludesPmBi = workflow.includes('pm-bi-panel');
      workflowPlaywrightJob = workflow.includes('playwright') && workflow.includes('ci-playwright-pm-bi-probe');
    } catch {
      workflowIncludesPmBi = false;
    }

    let ciGateIncludesProbe = false;
    try {
      const gate = fs.readFileSync(path.join(root, 'scripts/ci-contract-gate.sh'), 'utf8');
      ciGateIncludesProbe = gate.includes('ci-playwright-pm-bi-probe');
    } catch {
      ciGateIncludesProbe = false;
    }

    const ciPlaywrightPmBi = process.env.CI_PLAYWRIGHT_PM_BI === 'true';
    const ready = specExists && probeExists && workflowIncludesPmBi && ciGateIncludesProbe;

    return {
      ready,
      td012: ready ? 'yellow-minimum' : specExists ? 'partial' : 'down',
      domain: 'PLAYWRIGHT_CI',
      specExists,
      probeExists,
      workflowIncludesPmBi,
      workflowPlaywrightJob,
      ciGateIncludesProbe,
      ciPlaywrightPmBiEnv: ciPlaywrightPmBi,
      capabilities: ['Playwright PM BI spec', 'CI probe wiring', 'GitHub workflow job'],
      checkedAt: new Date().toISOString(),
    };
  }
}
