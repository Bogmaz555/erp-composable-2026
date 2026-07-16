import { Controller, Get } from '@nestjs/common';
import { DataIntegrityReadinessService } from './data-integrity-readiness.service';

@Controller()
export class DataIntegrityReadinessController {
  constructor(private readonly integrity: DataIntegrityReadinessService) {}

  @Get('platform/data-integrity/readiness')
  readiness() {
    return this.integrity.getReadiness();
  }
}
