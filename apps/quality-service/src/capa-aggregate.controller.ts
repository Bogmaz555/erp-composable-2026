import { Controller, Get } from '@nestjs/common';
import { CapaAggregateService } from './capa-aggregate.service';

/** W55 — public CAPA/NCR aggregate (smoke/regression) */
@Controller()
export class CapaAggregateController {
  constructor(private readonly capa: CapaAggregateService) {}

  @Get('capa/aggregate')
  aggregate() {
    return this.capa.aggregate();
  }
}
