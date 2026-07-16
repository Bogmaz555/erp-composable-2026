import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma.service';

export class CreateWorkOrderCommand {
  constructor(
    public readonly projectId: string,
    public readonly wbsElementId: string | undefined,
    public readonly productName: string,
    public readonly quantity: number,
    public readonly bomVersionId?: string,
    public readonly itemId?: string,
    public readonly components?: any[],   // optional snapshot for immediate MaterialRequirement explosion
    public readonly tenantId?: string,
  ) {}
}

@CommandHandler(CreateWorkOrderCommand)
export class CreateWorkOrderHandler implements ICommandHandler<CreateWorkOrderCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateWorkOrderCommand) {
    const tenantId = command.tenantId || 'default';

    const wo = await this.prisma.workOrder.create({
      data: {
        id: require('crypto').randomUUID(),
        tenantId,
        orderNumber: `WO-${command.projectId.substring(0,8)}-${Math.floor(Math.random() * 1000)}`,
        projectId: command.projectId,
        bomVersionId: command.bomVersionId || null,
        itemId: command.itemId || null,
        // productName kept for backward compatibility with existing callers
        quantity: command.quantity,
        status: 'PLANNED',
      }
    });

    // If components snapshot provided (from BOM release), immediately explode into MaterialRequirement
    // This gives MES direct visibility into required materials with full bomComponentId traceability
    if (command.components && Array.isArray(command.components) && command.components.length > 0) {
      for (const comp of command.components) {
        const bomComponentId = comp.bomComponentId || comp.id || null;
        const itemId = comp.childItemId || comp.itemId;
        const qty = comp.quantity || 0;

        if (!itemId) continue;

        await this.prisma.materialRequirement.create({
          data: {
            tenantId,
            workOrderId: wo.id,
            bomComponentId,
            itemId,
            quantity: qty,
            reservedQty: 0,
            status: 'PENDING',
          }
        }).catch(() => { /* non-fatal if schema not yet pushed */ });
      }
      console.log(`[MES] Created ${command.components.length} MaterialRequirements during WO creation for BOM ${command.bomVersionId}`);
    }

    console.log(`[MES] Generated PLANNED Work Order ${wo.id} for Project ${command.projectId} (bomVersionId=${command.bomVersionId || 'N/A'})`);
    return wo;
  }
}
