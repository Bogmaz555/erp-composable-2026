import { Controller, Get } from '@nestjs/common';
import { MtlsGatewayReadinessService } from './mtls-gateway-readiness.service';

@Controller()
export class MtlsGatewayReadinessController {
  constructor(private readonly mtlsGateway: MtlsGatewayReadinessService) {}

  @Get('platform/mtls-gateway/readiness')
  readiness() {
    return this.mtlsGateway.getReadiness();
  }
}
