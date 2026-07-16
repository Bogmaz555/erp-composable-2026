import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { ReleaseBomVersionCommand } from './release-bom-version.command';
import { PrismaService } from '../prisma.service';
import { BomReleasedEvent } from '../events/bom-released.event';
import { DoubleBomService } from '../double-bom.service';

@CommandHandler(ReleaseBomVersionCommand)
export class ReleaseBomVersionHandler implements ICommandHandler<ReleaseBomVersionCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
    private readonly doubleBom: DoubleBomService,
  ) {}

  async execute(command: ReleaseBomVersionCommand) {
    const bomVersion = await this.prisma.bomVersion.findUnique({
      where: { id: command.bomVersionId },
      include: {
        components: {
          include: {
            childItem: true,
          },
        },
        item: true,
      },
    });

    if (!bomVersion) {
      throw new Error('BOM Version not found');
    }

    // Update status to RELEASED
    const updated = await this.prisma.bomVersion.update({
      where: { id: command.bomVersionId },
      data: { 
        status: 'RELEASED',
        updatedAt: new Date(),
      },
    });

    // Double BOM explosion — flattened leaves for MRP/INV (W24-M01)
    const exploded = await this.doubleBom.explodeBomVersion(command.bomVersionId);
    const componentsSnapshot = (exploded.length ? exploded : bomVersion.components.map((c) => ({
      bomComponentId: c.id,
      childItemId: c.childItemId,
      childPartNumber: c.childItem.partNumber,
      quantity: c.quantity,
      position: c.position ?? undefined,
      scrapFactor: c.scrapFactor,
      bomLevel: 0,
      isSubAssembly: false as const,
      parentBomComponentId: undefined as string | undefined,
      subBomVersionId: undefined as string | undefined,
    }))).map((line) => ({
      bomComponentId: line.bomComponentId,
      childItemId: line.childItemId,
      childPartNumber: line.childPartNumber,
      quantity: line.quantity,
      position: line.position,
      scrapFactor: line.scrapFactor,
      bomLevel: line.bomLevel,
      parentBomComponentId: line.parentBomComponentId,
      isSubAssembly: line.isSubAssembly,
      subBomVersionId: line.subBomVersionId,
    }));

    const event = new BomReleasedEvent(
      updated.id,
      bomVersion.itemId,
      updated.revision,
      componentsSnapshot,
      new Date(),
      command.releasedBy
    );

    // Publish via Outbox for reliability (per architecture)
    await this.prisma.outboxEvent.create({
      data: {
        aggregateId: updated.id,
        aggregateType: 'BomVersion',
        eventType: 'plm.bom.released.v2',
        payload: {
          bomVersionId: updated.id,
          itemId: bomVersion.itemId,
          revision: updated.revision,
          components: componentsSnapshot,
          releasedAt: new Date(),
          releasedBy: command.releasedBy,
          // projectId and tenantId should be provided by caller (PM/CRM flow) for full auto-reserve
        },
        status: 'PENDING',
      },
    });

    // Also publish locally for immediate handling if needed
    this.eventBus.publish(event);

    return updated;
  }
}
