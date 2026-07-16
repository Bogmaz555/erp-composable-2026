import { Controller, Get } from '@nestjs/common';
import { SloRoutingReadinessService } from './slo-routing-readiness.service';

@Controller()
export class SloRoutingReadinessController {
  constructor(private readonly sloRouting: SloRoutingReadinessService) {}

  @Get('platform/slo-routing/readiness')
  readiness() {
    return this.sloRouting.getReadiness();
  }
}
