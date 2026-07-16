import { Controller, Get, Post, Patch, Body, Inject } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { PrismaService } from './prisma.service';
import { GetProjectsWithWbsQuery } from './queries/get-projects-with-wbs.query';
import { AddWbsElementCommand } from './commands/add-wbs-element.command';
import { UpdateWbsElementCommand } from './commands/update-wbs-element.command';
import { PrismaClient } from '.prisma/client-pm';

const directPrisma = new PrismaClient();

@Controller()
export class PmController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'pm-service',
      tenantId: this.prisma.tenantId,
    };
  }

  @Get()
  async getProjects() {
    return this.queryBus.execute(new GetProjectsWithWbsQuery());
  }

  @Post('wbs')
  async addWbsElement(@Body() body: { projectId: string; name: string; type?: string; parentId?: string }) {
    return this.commandBus.execute(
      new AddWbsElementCommand(body.projectId, body.name, body.type, body.parentId)
    );
  }

  @Patch('wbs')
  async updateWbsElement(@Body() body: { id: string; updates: any }) {
    return this.commandBus.execute(
      new UpdateWbsElementCommand(body.id, body.updates)
    );
  }

  @Post('seed-ccpm')
  async seedCCPM() {
    console.log('Seeding CCPM projects...');
    
    // Project 1: YELLOW
    await directPrisma.project.upsert({
      where: { id: 'seed-eto-alpha' },
      update: {
        name: 'ETO-Alpha (Yellow)',
        budget: 150000,
        ccpmBufferPct: 80.5,
        feverZone: 'YELLOW',
        totalChainDays: 120,
        totalBufferDays: 40,
        usedBufferDays: 32,
      },
      create: {
        id: 'seed-eto-alpha',
        name: 'ETO-Alpha (Yellow)',
        status: 'IN_PROGRESS',
        budget: 150000,
        ccpmBufferPct: 80.5,
        feverZone: 'YELLOW',
        totalChainDays: 120,
        totalBufferDays: 40,
        usedBufferDays: 32,
      }
    });

    // Project 2: GREEN
    await directPrisma.project.upsert({
      where: { id: 'seed-eto-beta' },
      update: {
        name: 'ETO-Beta (Green)',
        budget: 500000,
        ccpmBufferPct: 40.0,
        feverZone: 'GREEN',
        totalChainDays: 300,
        totalBufferDays: 100,
        usedBufferDays: 40,
      },
      create: {
        id: 'seed-eto-beta',
        name: 'ETO-Beta (Green)',
        status: 'IN_PROGRESS',
        budget: 500000,
        ccpmBufferPct: 40.0,
        feverZone: 'GREEN',
        totalChainDays: 300,
        totalBufferDays: 100,
        usedBufferDays: 40,
      }
    });

    // Project 3: RED
    await directPrisma.project.upsert({
      where: { id: 'seed-eto-gamma' },
      update: {
        name: 'ETO-Gamma (Red)',
        budget: 50000,
        ccpmBufferPct: 110.0,
        feverZone: 'RED',
        totalChainDays: 45,
        totalBufferDays: 15,
        usedBufferDays: 17,
      },
      create: {
        id: 'seed-eto-gamma',
        name: 'ETO-Gamma (Red)',
        status: 'IN_PROGRESS',
        budget: 50000,
        ccpmBufferPct: 110.0,
        feverZone: 'RED',
        totalChainDays: 45,
        totalBufferDays: 15,
        usedBufferDays: 17,
      }
    });

    return { success: true, message: 'CCPM Mock Data seeded successfully' };
  }
}
