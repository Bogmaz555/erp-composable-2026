import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PrismaClient } from '.prisma/client-eam';
import { HttpIotAdapter } from './iot/http-iot.adapter';
import type { IotAdapter } from './iot/iot-adapter';

@Controller('eam')
export class EamIotController {
  private readonly prisma = new PrismaClient();
  private readonly adapter: HttpIotAdapter;
  private connected = false;

  constructor() {
    this.adapter = new HttpIotAdapter({
      webhookUrl: process.env.EAM_IOT_WEBHOOK_URL || 'http://127.0.0.1:4019/eam/iot/sink',
    });
  }

  /** Expose adapter for DI/tests */
  getIotAdapter(): IotAdapter {
    return this.adapter;
  }

  @Get('iot/status')
  async iotStatus() {
    const [broken, total, recentCount] = await Promise.all([
      this.prisma.equipment.count({ where: { status: 'BROKEN' } }),
      this.prisma.equipment.count(),
      this.prisma.breakdownEvent.count({
        where: { detectedAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      }),
    ]);
    return {
      // source kept for contract compat; adapter fields are Enterprise Q2 additions
      source: 'eam-iot-lite',
      adapter: this.adapter.name,
      adapterState: this.adapter.getState(),
      equipmentTotal: total,
      brokenCount: broken,
      breakdownsLast7d: recentCount,
      iotEnabled: true,
      interface: 'IotAdapter',
    };
  }

  @Post('iot/connect')
  async connect() {
    await this.adapter.connect();
    this.connected = true;
    return { ok: true, adapter: this.adapter.name, state: this.adapter.getState() };
  }

  @Post('iot/telemetry')
  async publishTelemetry(
    @Body() body: { assetId: string; payload?: Record<string, unknown> },
  ) {
    if (!body?.assetId) {
      return { ok: false, reason: 'assetId required' };
    }
    try {
      await this.adapter.publishTelemetry(body.assetId, body.payload || {});
      return { ok: true, assetId: body.assetId, adapter: this.adapter.name };
    } catch (e) {
      return {
        ok: false,
        assetId: body.assetId,
        error: (e as Error).message,
        note: 'Webhook may be down; adapter interface still valid',
      };
    }
  }

  /** Local sink for self-test when webhook points at this service */
  @Post('iot/sink')
  async sink(@Body() body: Record<string, unknown>) {
    return { received: true, at: new Date().toISOString(), body };
  }

  @Get('breakdowns/recent')
  async recentBreakdowns(@Query('take') take = '10') {
    const n = Math.min(parseInt(take, 10) || 10, 50);
    const items = await this.prisma.breakdownEvent.findMany({
      orderBy: { detectedAt: 'desc' },
      take: n,
      include: { equipment: { select: { name: true, serialNumber: true, location: true } } },
    });
    return { count: items.length, items };
  }
}
