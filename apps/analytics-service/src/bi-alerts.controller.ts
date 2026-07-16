import { Body, Controller, Get, Post } from '@nestjs/common';

@Controller()
export class BiAlertsController {
  private lastWebhookAt: string | null = null;
  private lastAlertCount = 0;

  /** W95 — Alertmanager webhook sink (dev) */
  @Post('platform/bi-alerts/webhook')
  webhook(@Body() body: { alerts?: unknown[] }) {
    this.lastWebhookAt = new Date().toISOString();
    this.lastAlertCount = Array.isArray(body?.alerts) ? body.alerts.length : 0;
    return { ok: true, received: this.lastAlertCount, at: this.lastWebhookAt };
  }

  @Get('platform/bi-alerts/status')
  status() {
    return {
      lastWebhookAt: this.lastWebhookAt,
      lastAlertCount: this.lastAlertCount,
    };
  }
}
