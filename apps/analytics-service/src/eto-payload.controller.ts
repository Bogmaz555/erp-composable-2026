import { Controller, Get } from '@nestjs/common';
import { EtoPayloadService } from './eto-payload.service';

@Controller()
export class EtoPayloadController {
  constructor(private readonly eto: EtoPayloadService) {}

  @Get('platform/eto-payload/readiness')
  readiness() {
    return this.eto.getReadiness();
  }
}
