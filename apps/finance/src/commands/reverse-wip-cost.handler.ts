import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma.service';
import { Logger } from '@nestjs/common';
import { RecordTransactionCommand } from './record-transaction.handler';
import { CommandBus } from '@nestjs/cqrs';

export class ReverseWipCostCommand {
  constructor(
    public readonly projectId: string,
    public readonly tenantId: string,
    public readonly correlationId: string,
  ) {}
}

@CommandHandler(ReverseWipCostCommand)
export class ReverseWipCostHandler implements ICommandHandler<ReverseWipCostCommand> {
  private readonly logger = new Logger(ReverseWipCostHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: ReverseWipCostCommand) {
    const { projectId, tenantId, correlationId } = command;
    this.logger.log(`[Finance WIP] Reversing WIP costs for project ${projectId} (correlation: ${correlationId})`);

    return await this.prisma.$transaction(async (tx) => {
      const wip = await tx.wipAccount.findUnique({
        where: { projectId },
      });

      if (!wip) {
        this.logger.warn(`No WIP account found for project ${projectId}. Nothing to reverse.`);
        return;
      }

      const totalBalance = wip.wipBalance.toNumber();
      if (totalBalance <= 0) {
        return;
      }

      // Reverse ProjectCost
      await tx.projectCost.create({
        data: {
          tenantId,
          projectId,
          costType: 'REVERSAL',
          amount: -totalBalance,
          currency: 'PLN',
          reference: correlationId,
        },
      });

      // Reset WIP
      await tx.wipAccount.update({
        where: { projectId },
        data: {
          wipBalance: 0,
          laborCost: 0,
          materialReserved: 0,
        },
      });

      // GL Journal entry for credit (reversal)
      await this.commandBus.execute(
        new RecordTransactionCommand(
          'mock-wip-account-id',
          totalBalance,
          'CREDIT',
          correlationId,
          'SAGA_COMPENSATION',
          `Reversal of WIP for project ${projectId}`,
        ),
      );

      return true;
    });
  }
}
