import { Controller, Get, Param, Post } from '@nestjs/common';
import { BiProjectionService } from './bi-projection.service';

@Controller()
export class BiProjectionController {
  constructor(private readonly projection: BiProjectionService) {}

  /** W73 — refresh materialized BI snapshot for a project */
  @Post('bi/projects/:projectId/refresh')
  refresh(@Param('projectId') projectId: string) {
    return this.projection.refresh(projectId);
  }

  /** W73 — read materialized BI snapshot */
  @Get('bi/projects/:projectId/snapshot')
  snapshot(@Param('projectId') projectId: string) {
    return this.projection.getSnapshot(projectId);
  }
}
