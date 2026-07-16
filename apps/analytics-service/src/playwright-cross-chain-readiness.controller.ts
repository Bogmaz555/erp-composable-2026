import { Controller, Get } from '@nestjs/common';
import { PlaywrightCrossChainReadinessService } from './playwright-cross-chain-readiness.service';

@Controller()
export class PlaywrightCrossChainReadinessController {
  constructor(private readonly playwrightCrossChain: PlaywrightCrossChainReadinessService) {}

  @Get('platform/playwright-cross-chain/readiness')
  readiness() {
    return this.playwrightCrossChain.getReadiness();
  }
}
