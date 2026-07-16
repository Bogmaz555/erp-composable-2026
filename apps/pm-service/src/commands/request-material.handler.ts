import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma.service';
import { OutboxStatus } from '.prisma/client-pm';

export class RequestMaterialCommand {
  constructor(
    public readonly taskId: string,
    public readonly sku: string,           // itemId / childItemId
    public readonly quantity: number,
    public readonly bomComponentId?: string,  // for full ETO traceability to PLM
    public readonly tenantId?: string,
  ) {}
}

@CommandHandler(RequestMaterialCommand)
export class RequestMaterialHandler implements ICommandHandler<RequestMaterialCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: RequestMaterialCommand) {
    const task = await this.prisma.isolatedClient.task.findUnique({
      where: { id: command.taskId },
    });
    // Fallback: WbsElement if task not found
    let projectId = task?.projectId;
    if (!projectId) {
      const wbs = await this.prisma.isolatedClient.wbsElement.findUnique({
        where: { id: command.taskId }
      });
      if (wbs) projectId = wbs.projectId;
      else throw new Error('Task or WBS Element not found');
    }

    const tenantId = command.tenantId || 'default';
    const bomComponentId = command.bomComponentId || null;

    // Emit correct event name that INV already listens for (pm.material.requested.v1)
    // Payload enriched with bomComponentId so INV Reservation can link exactly
    await this.prisma.isolatedClient.outboxEvent.create({
      data: {
        id: require('crypto').randomUUID(),
        tenantId,
        aggregateId: command.taskId,
        aggregateType: 'MaterialRequest',
        eventType: 'pm.material.requested.v1',
        payload: {
          projectId: projectId,
          wbsElementId: command.taskId,
          itemId: command.sku,
          requestedQuantity: command.quantity,
          bomComponentId,
          tenantId,
        },
        status: OutboxStatus.PENDING,
      },
    });

    return { success: true, message: 'Material request (pm.material.requested.v1) saved to Outbox with bomComponentId' };
  }
}
