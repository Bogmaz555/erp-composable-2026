import { Controller, Get, Put, Post, Body, Inject } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { PrismaService } from './prisma.service';
import { GetOpportunitiesQuery } from './queries/get-opportunities.query';
import { UpdatePipelineStageCommand } from './commands/update-pipeline-stage.command';
import { CreateLeadCommand } from './commands/create-lead.command';
import { OpportunityStatus, Currency } from '.prisma/client-crm';

@Controller()
export class CrmController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'crm-service',
      tenantId: this.prisma.tenantId,
    };
  }

  @Get()
  async getOpportunities() {
    return this.queryBus.execute(new GetOpportunitiesQuery());
  }

  @Put('pipeline')
  async updatePipelineStage(@Body() body: { id: string; status: OpportunityStatus }) {
    return this.commandBus.execute(
      new UpdatePipelineStageCommand(body.id, body.status)
    );
  }

  @Post('lead')
  async createLead(@Body() body: { companyName: string; nip: string; email: string; title: string; estimatedValue: string | number; currency: Currency }) {
    const estimatedValueNum = body.estimatedValue ? parseFloat(body.estimatedValue.toString()) : 0;
    return this.commandBus.execute(
      new CreateLeadCommand(
        body.companyName,
        body.nip,
        body.email,
        body.title,
        estimatedValueNum,
        body.currency || 'PLN'
      )
    );
  }
}
