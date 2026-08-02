import { randomUUID } from 'crypto';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import {
  assertValidEventPayload,
  isEnterpriseProfile,
} from '@erp/shared-kernel';
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

    // Double BOM explosion — multi-level for MRP/INV (E1.1 / KD-E1.1)
    const exploded = await this.doubleBom.explodeBomVersion(command.bomVersionId, 8);
    const componentsSnapshot = (exploded.length
      ? exploded
      : bomVersion.components.map((c) => ({
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
          makeBuy: (c.childItem as { makeBuy?: string })?.makeBuy,
        }))
    ).map((line) => ({
      bomComponentId: line.bomComponentId,
      childItemId: line.childItemId,
      childPartNumber: line.childPartNumber,
      quantity: line.quantity,
      position: line.position,
      scrapFactor: line.scrapFactor,
      bomLevel: line.bomLevel,
      level: line.bomLevel,
      parentBomComponentId: line.parentBomComponentId,
      isSubAssembly: line.isSubAssembly,
      subBomVersionId: line.subBomVersionId,
      makeBuy: (line as { makeBuy?: string }).makeBuy,
    }));

    const correlationId = randomUUID();
    const payload = {
      bomVersionId: bomVersion.id,
      itemId: bomVersion.itemId,
      revision: bomVersion.revision,
      components: componentsSnapshot,
      releasedAt: new Date().toISOString(),
      releasedBy: command.releasedBy,
      correlationId,
    };

    if (isEnterpriseProfile()) {
      assertValidEventPayload('plm.bom.released.v2', payload);
    }

    // TX: status + outbox (event-only write path to peers)
    const updated = await this.prisma.$transaction(async (tx) => {
      const bom = await tx.bomVersion.update({
        where: { id: command.bomVersionId },
        data: {
          status: 'RELEASED',
          updatedAt: new Date(),
        },
      });
      await tx.outboxEvent.create({
        data: {
          aggregateId: bom.id,
          aggregateType: 'BomVersion',
          eventType: 'plm.bom.released.v2',
          payload,
          status: 'PENDING',
        },
      });
      return bom;
    });

    const event = new BomReleasedEvent(
      updated.id,
      bomVersion.itemId,
      updated.revision,
      componentsSnapshot,
      new Date(),
      command.releasedBy,
    );
    this.eventBus.publish(event);

    return updated;
  }
}
