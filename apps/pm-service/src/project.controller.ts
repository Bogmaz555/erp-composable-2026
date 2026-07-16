import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateTaskCommand } from './commands/create-task.command';
import { GetProjectTasksQuery } from './queries/get-project-tasks.query';
import { RequestMaterialCommand } from './commands/request-material.handler';
import { ReleaseProjectCommand } from './commands/release-project.handler';
import { ReachProjectMilestoneCommand } from './commands/reach-project-milestone.command';
import type { MilestoneType } from '@erp/shared-kernel';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PrismaService } from './prisma.service';
import { ScheduleService } from './schedule.service';
import { MspXmlService } from './msp-xml.service';

// TD-001: Protected (key ETO operations: task creation, material requests, project release)
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly prisma: PrismaService,
    private readonly schedule: ScheduleService,
    private readonly mspXml: MspXmlService,
  ) {}

  /** Harmonogram WBS + ścieżka krytyczna (CCPM/Gantt data) */
  @Get(':id/schedule')
  async getSchedule(@Param('id') projectId: string) {
    return this.schedule.getSchedule(projectId);
  }

  @Post(':id/baseline')
  async createBaseline(
    @Param('id') projectId: string,
    @Body() body: { name?: string; createdBy?: string },
  ) {
    return this.schedule.createBaseline(projectId, body.name, body.createdBy);
  }

  @Get(':id/baselines')
  async listBaselines(@Param('id') projectId: string) {
    return this.schedule.listBaselines(projectId);
  }

  @Get(':id/baseline/compare')
  async compareBaseline(
    @Param('id') projectId: string,
    @Query('baselineId') baselineId?: string,
  ) {
    return this.schedule.compareBaseline(projectId, baselineId);
  }

  @Post(':id/resources/level')
  async levelResources(@Param('id') projectId: string) {
    return this.schedule.levelResources(projectId);
  }

  /** Import harmonogramu z MS Project XML (MSPdi). */
  @Post(':id/schedule/import-xml')
  async importMspXml(
    @Param('id') projectId: string,
    @Body() body: { xml: string },
  ) {
    return this.mspXml.importToProject(projectId, body.xml || '');
  }

  @Get(':id/schedule/export-xml')
  async exportMspXml(@Param('id') projectId: string) {
    const xml = await this.mspXml.exportToXml(projectId);
    return { projectId, xml, filename: `project-${projectId}-msp.xml` };
  }

  @Post(':id/dependencies')
  async addDependency(
    @Param('id') projectId: string,
    @Body() body: { predecessorId: string; successorId: string; type?: string; lagDays?: number },
  ) {
    return this.prisma.taskDependency.create({
      data: {
        projectId,
        predecessorId: body.predecessorId,
        successorId: body.successorId,
        type: body.type ?? 'FS',
        lagDays: body.lagDays ?? 0,
      },
    });
  }

  /** Earned Value Management — PV/EV/AC/CPI/SPI dla projektów ETO */
  @Get(':id/evm')
  async getEvm(@Param('id') projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { wbsElements: true, tasks: true },
    });
    if (!project) return { error: 'Project not found' };
    const pv = project.budget ?? 0;
    const wbs = project.wbsElements;
    const done = wbs.filter((w) => w.status === 'DONE' || w.status === 'COMPLETED').length;
    const pct = wbs.length ? done / wbs.length : (project.tasks.filter((t) => t.status === 'DONE').length / Math.max(project.tasks.length, 1));
    const ev = pv * pct;
    const ac = (project.usedBufferDays ?? 0) * 1000 + done * 5000;
    const cpi = ac > 0 ? ev / ac : 0;
    const spi = pv > 0 ? ev / pv : 0;
    return {
      projectId,
      plannedValue: pv,
      earnedValue: Math.round(ev),
      actualCost: Math.round(ac),
      percentComplete: Math.round(pct * 100),
      cpi: Math.round(cpi * 100) / 100,
      spi: Math.round(spi * 100) / 100,
      cpiStatus: cpi >= 1 ? 'GREEN' : cpi >= 0.9 ? 'AMBER' : 'RED',
      spiStatus: spi >= 1 ? 'GREEN' : spi >= 0.9 ? 'AMBER' : 'RED',
    };
  }

  @Post(':id/tasks')
  async createTask(
    @Param('id') projectId: string,
    @Body() body: { title: string },
  ) {
    return this.commandBus.execute(new CreateTaskCommand(projectId, body.title));
  }

  @Get(':id/tasks')
  async getTasks(@Param('id') projectId: string) {
    return this.queryBus.execute(new GetProjectTasksQuery(projectId));
  }

  @Post(':id/tasks/:taskId/materials')
  async requestMaterial(
    @Param('id') projectId: string,
    @Param('taskId') taskId: string,
    @Body() body: { sku: string; quantity: number },
  ) {
    return this.commandBus.execute(new RequestMaterialCommand(taskId, body.sku, body.quantity));
  }

  @Post(':id/release')
  async releaseProject(@Param('id') projectId: string) {
    return this.commandBus.execute(new ReleaseProjectCommand(projectId));
  }

  /** FAT / SAT / SHIPMENT / FINAL — triggers finance.payment.milestone.reached.v1 */
  @Post(':id/milestones/:milestone/reach')
  async reachMilestone(
    @Param('id') projectId: string,
    @Param('milestone') milestone: MilestoneType,
    @Body() body: { amount: number; percent?: number; tenantId?: string },
  ) {
    return this.commandBus.execute(
      new ReachProjectMilestoneCommand(
        projectId,
        milestone,
        body.amount,
        body.percent,
        body.tenantId,
      ),
    );
  }
}
