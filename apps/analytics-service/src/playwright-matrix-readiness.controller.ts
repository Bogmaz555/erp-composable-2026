import { Controller, Get } from '@nestjs/common';
import { PlaywrightMatrixReadinessService } from './playwright-matrix-readiness.service';

@Controller()
export class PlaywrightMatrixReadinessController {
  constructor(private readonly playwrightMatrix: PlaywrightMatrixReadinessService) {}

  @Get('platform/playwright-matrix/readiness')
  readiness() {
    return this.playwrightMatrix.getReadiness();
  }
}
