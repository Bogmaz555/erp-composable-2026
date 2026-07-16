import { Controller, Get } from '@nestjs/common';
import { ImportStagingPersistenceReadinessService } from './import-staging-persistence-readiness.service';

@Controller()
export class ImportStagingPersistenceReadinessController {
  constructor(private readonly persistence: ImportStagingPersistenceReadinessService) {}

  @Get('platform/import-staging/readiness')
  readiness() {
    return this.persistence.getReadiness();
  }
}
