import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PlaywrightMatrixReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-playwright-matrix-probe.ts'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  }

  async getReadiness() {
    const root = this.findRepoRoot();
    const specs = [
      'e2e/pm-bi-panel.spec.ts',
      'e2e/finance-module.spec.ts',
      'e2e/inv-module.spec.ts',
      'e2e/proc-module.spec.ts',
      'e2e/quality-module.spec.ts',
      'e2e/mes-module.spec.ts',
      'e2e/eam-module.spec.ts',
      'e2e/crm-module.spec.ts',
      'e2e/tax-module.spec.ts',
      'e2e/hr-module.spec.ts',
      'e2e/plm-module.spec.ts',
    ];
    const specFiles = specs.map((s) => fs.existsSync(path.join(root, s)));
    const probeScript = fs.existsSync(path.join(root, 'scripts/ci-playwright-matrix-probe.ts'));
    const bootScript = fs.existsSync(path.join(root, 'scripts/ci-playwright-stack-boot.sh'));

    let workflowMatrixJob = false;
    let workflowNoContinueOnError = false;
    try {
      const workflow = fs.readFileSync(path.join(root, '.github/workflows/erp-ci.yml'), 'utf8');
      workflowMatrixJob = workflow.includes('playwright-matrix');
      const block = workflow.split('playwright-matrix:')[1]?.split('\n  playwright:')[0] ?? '';
      workflowNoContinueOnError = workflowMatrixJob && !block.includes('continue-on-error: true');
    } catch {
      workflowMatrixJob = false;
    }

    let ciGateIncludesProbe = false;
    try {
      const gate = fs.readFileSync(path.join(root, 'scripts/ci-contract-gate.sh'), 'utf8');
      ciGateIncludesProbe = gate.includes('ci-playwright-matrix-probe');
    } catch {
      ciGateIncludesProbe = false;
    }

    const ready =
      specFiles.every(Boolean) &&
      probeScript &&
      bootScript &&
      workflowMatrixJob &&
      workflowNoContinueOnError &&
      ciGateIncludesProbe;

    return {
      ready,
      td012: ready ? 'yellow-minimum' : workflowMatrixJob ? 'partial' : 'down',
      domain: 'PLAYWRIGHT_MATRIX',
      specs: Object.fromEntries(specs.map((s, i) => [s, specFiles[i]])),
      probeScript,
      bootScript,
      workflowMatrixJob,
      workflowNoContinueOnError,
      ciGateIncludesProbe,
      ciPlaywrightMatrixEnv: process.env.CI_PLAYWRIGHT_MATRIX === 'true',
      capabilities: ['PM BI', 'Finance', 'INV', 'PROC', 'Quality', 'MES', 'EAM', 'CRM', 'Tax', 'HR', 'PLM E2E matrix (11 modules)'],
      checkedAt: new Date().toISOString(),
    };
  }
}
