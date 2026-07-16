import { Controller, Get } from '@nestjs/common';
import { EamProductionService } from './eam-production.service';

/** W137 — public EAM production status */
@Controller('eam')
export class EamProductionController {
  constructor(private readonly prod: EamProductionService) {}

  @Get('production/status')
  status() {
    return this.prod.status();
  }
}
