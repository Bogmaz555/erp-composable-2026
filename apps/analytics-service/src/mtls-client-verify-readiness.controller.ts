import { Controller, Get } from '@nestjs/common';
import { MtlsClientVerifyReadinessService } from './mtls-client-verify-readiness.service';

@Controller()
export class MtlsClientVerifyReadinessController {
  constructor(private readonly mtlsClientVerify: MtlsClientVerifyReadinessService) {}

  @Get('platform/mtls-client-verify/readiness')
  readiness() {
    return this.mtlsClientVerify.getReadiness();
  }
}
