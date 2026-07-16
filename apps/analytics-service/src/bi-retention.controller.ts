import { Controller, Get, Post } from '@nestjs/common';
import { BiSnapshotRetentionService } from './bi-snapshot-retention.service';
import { BiProjectionService } from './bi-projection.service';

@Controller()
export class BiRetentionController {
  constructor(
    private readonly retention: BiSnapshotRetentionService,
    private readonly projection: BiProjectionService,
  ) {}

  /** W79 — retention status */
  @Get('bi/snapshots/retention/status')
  status() {
    return this.retention.getStatus();
  }

  /** W79 — manual purge of expired snapshots */
  @Post('bi/snapshots/purge')
  purge() {
    return this.retention.purgeExpired();
  }

  @Get('bi/snapshots/stats')
  stats() {
    return this.projection.snapshotStats();
  }
}
