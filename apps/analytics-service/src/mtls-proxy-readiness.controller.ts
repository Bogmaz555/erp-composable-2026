import { Controller, Get } from '@nestjs/common';
import { MtlsProxyReadinessService } from './mtls-proxy-readiness.service';

@Controller()
export class MtlsProxyReadinessController {
  constructor(private readonly mtlsProxy: MtlsProxyReadinessService) {}

  @Get('platform/mtls-proxy/readiness')
  readiness() {
    return this.mtlsProxy.getReadiness();
  }
}
