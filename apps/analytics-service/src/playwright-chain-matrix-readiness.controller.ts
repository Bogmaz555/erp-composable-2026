import { Controller, Get } from '@nestjs/common';
import { PlaywrightChainMatrixReadinessService } from './playwright-chain-matrix-readiness.service';

@Controller()
export class PlaywrightChainMatrixReadinessController {
  constructor(private readonly chainMatrix: PlaywrightChainMatrixReadinessService) {}

  @Get('platform/playwright-chain-matrix/readiness')
  readiness() {
    return this.chainMatrix.getReadiness();
  }
}
