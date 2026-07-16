import { Controller, Get } from '@nestjs/common';
import { ImportReadinessService } from './import-readiness.service';

@Controller()
export class ImportReadinessController {
  constructor(private readonly imp: ImportReadinessService) {}

  @Get('platform/import/readiness')
  readiness() {
    return this.imp.getReadiness();
  }
}
