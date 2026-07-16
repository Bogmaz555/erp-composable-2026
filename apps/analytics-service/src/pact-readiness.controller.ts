import { Controller, Get } from '@nestjs/common';
import { PactReadinessService } from './pact-readiness.service';

@Controller()
export class PactReadinessController {
  constructor(private readonly pact: PactReadinessService) {}

  @Get('platform/pact/readiness')
  readiness() {
    return this.pact.getReadiness();
  }
}
