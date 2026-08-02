import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateReservationCommand } from './create-reservation.command';
import { PrismaService } from '../prisma.service';

@CommandHandler(CreateReservationCommand)
export class CreateReservationHandler implements ICommandHandler<CreateReservationCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateReservationCommand) {
    const tenantId = command.tenantId || 'default';

    // Domain write + outbox in one TX (never orphan domain without outbox row)
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.create({
        data: {
          tenantId,
          itemId: command.itemId,
          quantity: command.quantity,
          projectId: command.projectId,
          workOrderId: command.workOrderId,
          bomComponentId: command.bomComponentId || null,
          lotId: command.lotId,
          status: 'ACTIVE',
          createdBy: command.createdBy || null,
        },
      });

      // ETO traceability: record immutable StockTransaction for the reservation
      await tx.stockTransaction.create({
        data: {
          tenantId,
          itemId: command.itemId,
          lotId: command.lotId || null,
          type: 'RESERVATION',
          quantity: command.quantity,
          referenceType: command.workOrderId ? 'WORK_ORDER' : (command.projectId ? 'PROJECT' : 'BOM_RELEASE'),
          referenceId: command.workOrderId || command.projectId || null,
          notes: command.bomComponentId ? `Linked to BomComponent ${command.bomComponentId}` : null,
          createdBy: command.createdBy || null,
        },
      });

      // For ETO traceability: also reduce available stock level
      const stock = await tx.stockLevel.findFirst({ where: { itemId: command.itemId, tenantId } });
      if (stock) {
        await tx.stockLevel.update({
          where: { id: stock.id },
          data: { quantity: Math.max(0, stock.quantity - command.quantity) },
        });
      }

      // Publish inventory.reservation.created.v1 via Outbox (MES / Finance WIP / PROC)
      await tx.outboxEvent.create({
        data: {
          tenantId,
          aggregateId: reservation.id,
          aggregateType: 'Reservation',
          eventType: 'inventory.reservation.created.v1',
          payload: {
            reservationId: reservation.id,
            tenantId,
            projectId: command.projectId,
            workOrderId: command.workOrderId,
            bomComponentId: command.bomComponentId,
            itemId: command.itemId,
            lotId: command.lotId,
            quantity: command.quantity,
            status: 'ACTIVE',
            createdAt: reservation.createdAt,
            createdBy: command.createdBy || 'system',
          },
          status: 'PENDING',
        },
      });

      return reservation;
    });
  }
}
