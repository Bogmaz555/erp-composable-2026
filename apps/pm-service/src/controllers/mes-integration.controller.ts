import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { CommandBus } from '@nestjs/cqrs';
import { ApplyNcrDelayCommand } from '../commands/apply-ncr-delay.handler';
import { PrismaService } from '../prisma.service';

@Controller()
export class MesIntegrationController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly prisma: PrismaService,
  ) {}

  @EventPattern('mes.ncr.raised.v1')
  handleMesNcrRaised(
    @Payload()
    event: {
      projectId: string;
      workOrderId: string;
      defectCode: string;
    },
  ) {
    if (!event.projectId) {
      return; // Brak referencji ETO - maszyna seryjna (MTS) zignorowana w kontekście PM
    }
    
    return this.commandBus.execute(
      new ApplyNcrDelayCommand(event.projectId, event.workOrderId, event.defectCode)
    );
  }

  @EventPattern('mes.labor.cost_recorded')
  async handleLaborCostRecorded(
    @Payload()
    event: {
      projectId?: string;
      workOrderId: string;
      laborCost: number;
    },
  ) {
    console.log(`[PM] Otrzymano zdarzenie mes.labor.cost_recorded:`, event);
    if (!event.projectId) {
      console.warn(`[PM] Brak projectId, ignoruję zdarzenie.`);
      return; // Skip if no project associated
    }
    
    // Update the project's actualLaborCost
    await this.prisma.project.update({
      where: { id: event.projectId },
      data: {
        actualLaborCost: { increment: event.laborCost },
      },
    });
    
    console.log(`[PM] Zaktualizowano koszt robocizny (Actual Labor Cost) dla projektu ${event.projectId} o ${event.laborCost.toFixed(2)} PLN.`);
  }
}
