import { Controller, Get, Param } from '@nestjs/common';
import { BiProjectDashboardService } from './bi-project-dashboard.service';

@Controller()
export class BiProjectDashboardController {
  constructor(private readonly dashboard: BiProjectDashboardService) {}

  /** W67 — BI read model aggregating PM/Finance/MES/Quality for a project */
  @Get('bi/projects/:projectId/dashboard')
  projectDashboard(@Param('projectId') projectId: string) {
    return this.dashboard.getDashboard(projectId);
  }
}
