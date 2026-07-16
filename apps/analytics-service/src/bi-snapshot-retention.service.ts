import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { BiProjectionService } from './bi-projection.service';

@Injectable()
export class BiSnapshotRetentionService {
  private readonly logger = new Logger(BiSnapshotRetentionService.name);
  private lastPurgeAt: string | null = null;
  private lastPurgedCount = 0;
  private readonly enabled = process.env.BI_RETENTION_ENABLED !== 'false';

  constructor(private readonly projection: BiProjectionService) {}

  getStatus() {
    return {
      enabled: this.enabled,
      ttlHours: this.projection.getTtlHours(),
      lastPurgeAt: this.lastPurgeAt,
      lastPurgedCount: this.lastPurgedCount,
      persistence: this.projection.getPersistenceMode(),
    };
  }

  async purgeExpired() {
    if (!this.enabled) return { ...this.getStatus(), purged: 0 };
    const result = await this.projection.purgeExpired();
    this.lastPurgeAt = new Date().toISOString();
    this.lastPurgedCount = result.purged;
    this.logger.debug(`Purged ${result.purged} BI snapshots older than ${result.ttlHours}h`);
    return { ...this.getStatus(), ...result };
  }

  @Interval(300000)
  async scheduledPurge() {
    await this.purgeExpired();
  }
}
