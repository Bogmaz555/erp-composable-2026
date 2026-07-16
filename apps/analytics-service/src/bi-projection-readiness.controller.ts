import { Controller, Get } from '@nestjs/common';
import { BiProjectionReadinessService } from './bi-projection-readiness.service';

@Controller()
export class BiProjectionReadinessController {
  constructor(private readonly biProjection: BiProjectionReadinessService) {}

  @Get('platform/bi-projection/readiness')
  readiness() {
    return this.biProjection.getReadiness();
  }
}
