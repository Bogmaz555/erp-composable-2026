import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  liveness() {
    return { status: 'ok', service: 'inv-service' };
  }

  @Get('ready')
  async readiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', service: 'inv-service', db: 'up' };
    } catch {
      return { status: 'degraded', service: 'inv-service', db: 'down' };
    }
  }
}
