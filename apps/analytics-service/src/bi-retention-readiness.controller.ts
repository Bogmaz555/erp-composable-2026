import { Controller, Get } from '@nestjs/common';
import { BiRetentionReadinessService } from './bi-retention-readiness.service';

@Controller()
export class BiRetentionReadinessController {
  constructor(private readonly biRetention: BiRetentionReadinessService) {}

  @Get('platform/bi-retention/readiness')
  readiness() {
    return this.biRetention.getReadiness();
  }
}
