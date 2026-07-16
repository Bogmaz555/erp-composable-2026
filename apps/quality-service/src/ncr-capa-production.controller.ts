import { Controller, Get } from '@nestjs/common';
import { NcrCapaProductionService } from './ncr-capa-production.service';

/** W137 — public NCR/CAPA production status */
@Controller()
export class NcrCapaProductionController {
  constructor(private readonly prod: NcrCapaProductionService) {}

  @Get('ncr-capa/production')
  production() {
    return this.prod.production();
  }
}
