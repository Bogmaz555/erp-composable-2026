import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PrismaService } from './prisma.service';
import { PmController } from './pm.controller';
import { CrmIntegrationController } from './crm-integration.controller';
import { PlmIntegrationController } from './plm-integration.controller';
import { ProcIntegrationController } from './proc-integration.controller';
import { QualityIntegrationController } from './quality-integration.controller';
import { EamIntegrationController } from './eam-integration.controller';
import { GetProjectsWithWbsHandler } from './queries/get-projects-with-wbs.handler';
import { AddWbsElementHandler } from './commands/add-wbs-element.handler';
import { UpdateWbsElementHandler } from './commands/update-wbs-element.handler';
import { CreateProjectFromOpportunityHandler } from './commands/create-project-from-opportunity.handler';
import { ProjectController } from './project.controller';
import { CreateTaskHandler } from './commands/create-task.handler';
import { GetProjectTasksHandler } from './queries/get-project-tasks.handler';
import { RequestMaterialHandler } from './commands/request-material.handler';
import { ReleaseProjectHandler } from './commands/release-project.handler';
import { LinkProjectBomHandler } from './commands/link-project-bom.handler';
import { ReachProjectMilestoneHandler } from './commands/reach-project-milestone.handler';
import { ScheduleService } from './schedule.service';
import { MspXmlService } from './msp-xml.service';
import { MesIntegrationController } from './controllers/mes-integration.controller';
import { ApplyNcrDelayHandler } from './commands/apply-ncr-delay.handler';

@Module({
  imports: [
    CqrsModule,
    ClientsModule.register([
      {
        name: 'NATS_SERVICE',
        transport: Transport.NATS,
        options: {
          servers: [process.env.NATS_URL || 'nats://localhost:4222'],
        },
      },
    ]),
  ],
  controllers: [
    PmController,
    CrmIntegrationController,
    ProjectController,
    PlmIntegrationController,
    ProcIntegrationController,
    QualityIntegrationController,
    EamIntegrationController,
    MesIntegrationController,
  ],
  providers: [
    PrismaService,
    GetProjectsWithWbsHandler,
    AddWbsElementHandler,
    UpdateWbsElementHandler,
    CreateProjectFromOpportunityHandler,
    CreateTaskHandler,
    GetProjectTasksHandler,
    RequestMaterialHandler,
    ReleaseProjectHandler,
    LinkProjectBomHandler,
    ReachProjectMilestoneHandler,
    ScheduleService,
    MspXmlService,
    ApplyNcrDelayHandler,
  ],
})
export class AppModule {}
