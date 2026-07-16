import { Controller, Post, Delete, Get, Body, Param } from '@nestjs/common';
import { ImportStagingService } from './import-staging.service';

@Controller()
export class ImportStagingController {
  constructor(private readonly staging: ImportStagingService) {}

  /** W64/W69 — stage CSV (Prisma or in-memory fallback) */
  @Post('import/products/stage')
  stage(@Body() body: { csv: string }) {
    return this.staging.stage(body.csv || '');
  }

  @Get('import/products/stage/:batchId')
  getStaged(@Param('batchId') batchId: string) {
    return this.staging.getBatch(batchId).then((b) => b ?? { ok: false, error: 'Batch not found' });
  }

  @Post('import/products/commit/:batchId')
  commit(@Param('batchId') batchId: string) {
    return this.staging.commit(batchId);
  }

  @Delete('import/products/stage/:batchId')
  rollback(@Param('batchId') batchId: string) {
    return this.staging.rollback(batchId);
  }
}
