import { Controller, Get } from '@nestjs/common';
import { RoutingAggregateService } from './routing-aggregate.service';

/** W52 — public routing aggregate (smoke/regression, no JWT) */
@Controller('routing')
export class RoutingController {
  constructor(private readonly routing: RoutingAggregateService) {}

  @Get('aggregate')
  aggregate() {
    return this.routing.aggregate();
  }
}
