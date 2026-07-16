import { Controller, Get } from '@nestjs/common';
import { TlsRotationReadinessService } from './tls-rotation-readiness.service';

@Controller()
export class TlsRotationReadinessController {
  constructor(private readonly tlsRotation: TlsRotationReadinessService) {}

  @Get('platform/tls-rotation/readiness')
  readiness() {
    return this.tlsRotation.getReadiness();
  }
}
