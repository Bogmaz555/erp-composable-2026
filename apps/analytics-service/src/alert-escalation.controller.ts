import { Body, Controller, Get, Post } from '@nestjs/common';

@Controller()
export class AlertEscalationController {
  private lastPagerDutyAt: string | null = null;
  private lastOpsgenieAt: string | null = null;

  /** W103 — PagerDuty Events API v2 sink (dev) */
  @Post('platform/alert-escalation/pagerduty-sink')
  pagerdutySink(@Body() body: unknown) {
    this.lastPagerDutyAt = new Date().toISOString();
    return { ok: true, channel: 'pagerduty-sink', received: body != null };
  }

  /** W103 — Opsgenie webhook sink (dev) */
  @Post('platform/alert-escalation/opsgenie-sink')
  opsgenieSink(@Body() body: unknown) {
    this.lastOpsgenieAt = new Date().toISOString();
    return { ok: true, channel: 'opsgenie-sink', received: body != null };
  }

  @Get('platform/alert-escalation/status')
  status() {
    return { lastPagerDutyAt: this.lastPagerDutyAt, lastOpsgenieAt: this.lastOpsgenieAt };
  }
}
