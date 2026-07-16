import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma.service';

export class CreateECOCommand {
  constructor(
    public readonly title: string,
    public readonly description: string,
    public readonly bomId?: string
  ) {}
}

@CommandHandler(CreateECOCommand)
export class CreateECOHandler implements ICommandHandler<CreateECOCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateECOCommand) {
    const nextNumber = Math.floor(1000 + Math.random() * 9000);
    const ecoNumber = `ECO-${nextNumber}`;

    const eco = await this.prisma.engineeringChangeOrder.create({
      data: {
        id: require('crypto').randomUUID(),
        ecoNumber: ecoNumber,
        title: command.title,
        description: command.description,
        status: 'PENDING',
        affectedBoms: command.bomId ? [command.bomId] : undefined,
      },
    });

    console.log(`[PLM] Created ECO ${ecoNumber}`);
    return eco;
  }
}
