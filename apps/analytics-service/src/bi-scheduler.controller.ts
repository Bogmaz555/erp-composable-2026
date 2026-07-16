import { Controller, Get, Post } from '@nestjs/common';
import { BiRefreshSchedulerService } from './bi-refresh-scheduler.service';

@Controller()
export class BiSchedulerController {
  constructor(private readonly scheduler: BiRefreshSchedulerService) {}

  /** W75 — scheduler status */
  @Get('bi/scheduler/status')
  status() {
    return this.scheduler.getStatus();
  }

  /** W75 — manual tick (refresh active project snapshots) */
  @Post('bi/scheduler/tick')
  tick() {
    return this.scheduler.refreshActiveProjects();
  }
}
