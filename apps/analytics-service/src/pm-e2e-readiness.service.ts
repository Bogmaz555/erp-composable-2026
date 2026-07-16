import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PmE2eReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'e2e/pm-bi-panel.spec.ts'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  }

  async getReadiness() {
    const root = this.findRepoRoot();
    const specPath = path.join(root, 'e2e/pm-bi-panel.spec.ts');
    const playwrightConfig = path.join(root, 'playwright.config.ts');
    let specExists = false;
    let specCoversBi = false;
    try {
      const spec = fs.readFileSync(specPath, 'utf8');
      specExists = true;
      specCoversBi = spec.includes('BI Read Model') && spec.includes('/pm');
    } catch {
      specExists = false;
    }
    const playwrightConfigured = fs.existsSync(playwrightConfig);

    return {
      ready: specExists && specCoversBi && playwrightConfigured,
      td012: specExists ? (specCoversBi ? 'yellow-minimum' : 'partial') : 'down',
      domain: 'PM_E2E',
      specExists,
      specCoversBi,
      playwrightConfigured,
      specPath: 'e2e/pm-bi-panel.spec.ts',
      capabilities: ['Playwright PM BI panel', 'live read model assertion'],
      checkedAt: new Date().toISOString(),
    };
  }
}
