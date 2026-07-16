import { Body, Controller, Get, Post } from '@nestjs/common';

@Controller()
export class AlertNotifyController {
  private lastSlackAt: string | null = null;
  private lastEmailAt: string | null = null;

  /** W99 — Slack notification sink (dev) */
  @Post('platform/alert-notify/slack-sink')
  slackSink(@Body() body: unknown) {
    this.lastSlackAt = new Date().toISOString();
    return { ok: true, channel: 'slack-sink', received: body != null };
  }

  /** W99 — Email smarthost sink (Alertmanager email_configs dev) */
  @Post('platform/alert-notify/email-sink')
  emailSink(@Body() body: unknown) {
    this.lastEmailAt = new Date().toISOString();
    return { ok: true, channel: 'email-sink', received: body != null };
  }

  @Get('platform/alert-notify/status')
  status() {
    return { lastSlackAt: this.lastSlackAt, lastEmailAt: this.lastEmailAt };
  }
}
