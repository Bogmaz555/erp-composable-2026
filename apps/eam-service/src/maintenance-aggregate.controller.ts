import { Controller, Get } from '@nestjs/common';
import { MaintenanceAggregateService } from './maintenance-aggregate.service';

/** W57 — public maintenance aggregate (smoke/regression) */
@Controller('eam')
export class MaintenanceAggregateController {
  constructor(private readonly maintenance: MaintenanceAggregateService) {}

  @Get('maintenance/aggregate')
  aggregate() {
    return this.maintenance.aggregate();
  }
}
