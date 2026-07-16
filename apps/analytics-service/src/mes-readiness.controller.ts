import { Controller, Get } from '@nestjs/common';
import { MesReadinessService } from './mes-readiness.service';

@Controller()
export class MesReadinessController {
  constructor(private readonly mes: MesReadinessService) {}

  @Get('platform/mes/readiness')
  readiness() {
    return this.mes.getReadiness();
  }
}
