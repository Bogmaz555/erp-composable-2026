import { Controller, Get, Param } from '@nestjs/common';
import { ProjectCostSummaryService } from './project-cost-summary.service';

@Controller()
export class ProjectCostSummaryController {
  constructor(private readonly summary: ProjectCostSummaryService) {}

  /** W59 — live project cost summary (replaces frontend mock analytics) */
  @Get('projects/:projectId/cost-summary')
  costSummary(@Param('projectId') projectId: string) {
    return this.summary.getSummary(projectId);
  }
}
