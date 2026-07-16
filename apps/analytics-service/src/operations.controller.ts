import { Controller, Get } from '@nestjs/common';
import { OperationsService } from './operations.service';

@Controller()
export class OperationsController {
  constructor(private readonly ops: OperationsService) {}

  @Get('command-center')
  async commandCenter() {
    return this.ops.getCommandCenter();
  }

  @Get('operations/health-matrix')
  async healthMatrix() {
    const cc = await this.ops.getCommandCenter();
    return {
      generatedAt: cc.generatedAt,
      matrix: cc.services.map((s) => ({
        name: s.name,
        status: s.status,
        httpCode: s.httpCode,
        latencyMs: s.latencyMs,
      })),
      summary: cc.summary,
    };
  }

  @Get('platform/gateway/readiness')
  async gatewayReadiness() {
    return this.ops.getGatewayReadiness();
  }

  @Get('platform/stack/readiness')
  async stackReadiness() {
    return this.ops.getStackReadiness();
  }
}
