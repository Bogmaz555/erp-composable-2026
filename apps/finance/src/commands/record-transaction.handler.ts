import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaClient, EntryType } from '@prisma/client-finance';

export class RecordTransactionCommand {
  constructor(
    public readonly accountId: string,
    public readonly amount: number,
    public readonly type: EntryType,
    public readonly referenceId?: string,
    public readonly source?: string,
    public readonly description?: string,
  ) {}
}

@CommandHandler(RecordTransactionCommand)
export class RecordTransactionHandler implements ICommandHandler<RecordTransactionCommand> {
  private prisma = new PrismaClient();

  async execute(command: RecordTransactionCommand) {
    const { accountId, amount, type, referenceId, source, description } = command;

    // Utworzenie wpisu w dzienniku (JournalEntry) oraz aktualizacja salda konta w jednej transakcji
    return await this.prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({
        data: {
          accountId,
          amount,
          type,
          referenceId,
          source,
          description,
        },
      });

      const balanceModifier = type === 'DEBIT' ? amount : -amount;
      
      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: {
            increment: balanceModifier,
          },
        },
      });

      return entry;
    });
  }
}
