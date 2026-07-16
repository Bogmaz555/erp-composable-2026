import type { PurchaseOrderApprovedEvent } from '@erp/shared-kernel';
import type { PrismaService } from './prisma.service';
import type { CommandBus } from '@nestjs/cqrs';
import { RecordTransactionCommand } from './commands/record-transaction.handler';
import { computeMaterialCommitmentPln } from './eto-project-costing';
import { ensureAccount } from './finance-accounts';

export async function bookProcurementCommitment(
  prisma: PrismaService,
  commandBus: CommandBus,
  payload: PurchaseOrderApprovedEvent,
  logger: { log: (m: string) => void; warn: (m: string) => void },
) {
  const amount = computeMaterialCommitmentPln(payload.quantity);
  const tenantId = 'default';

  if (payload.projectId) {
    try {
      await prisma.projectCost.create({
        data: {
          tenantId,
          projectId: payload.projectId,
          costType: 'MATERIAL',
          amount,
          currency: 'PLN',
          reference: payload.orderId,
        },
      });
      await prisma.wipAccount.upsert({
        where: { projectId: payload.projectId },
        update: { materialReserved: { increment: amount } },
        create: {
          tenantId,
          projectId: payload.projectId,
          materialReserved: amount,
          wipBalance: 0,
          laborCost: 0,
        },
      });
    } catch (e) {
      logger.warn(`[Finance] ProjectCost/WIP for PO ${payload.orderId}: ${(e as Error).message}`);
    }
  }

  const liability = await ensureAccount(
    prisma,
    '201-AP',
    'Zobowiązania wobec dostawców',
    'LIABILITY',
  );

  await commandBus.execute(
    new RecordTransactionCommand(
      liability.id,
      amount,
      'CREDIT',
      payload.orderId,
      'PROCUREMENT',
      `Zobowiązanie PO ${payload.orderId} sku=${payload.sku} qty=${payload.quantity}`,
    ),
  );

  try {
    const due = new Date();
    due.setDate(due.getDate() + 14);
    await prisma.payable.create({
      data: {
        vendor: payload.sku,
        amount,
        currency: 'PLN',
        dueDate: due,
        status: 'PENDING',
        orderRef: payload.orderId,
      },
    });
  } catch (e) {
    logger.warn(`[Finance] Payable create failed: ${(e as Error).message}`);
  }

  logger.log(`[Finance] Procurement commitment ${amount} PLN for PO ${payload.orderId}`);
}
