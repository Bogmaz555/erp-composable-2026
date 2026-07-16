import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma.service';

export class CreateBOMCommand {
  constructor(
    public readonly partNumber: string,
    public readonly description: string,
    public readonly revision: string,
    public readonly components: any[]
  ) {}
}

@CommandHandler(CreateBOMCommand)
export class CreateBOMHandler implements ICommandHandler<CreateBOMCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateBOMCommand) {
    // Legacy /boms endpoint mapped onto the new Item + BomVersion model.
    const item = await this.prisma.item.upsert({
      where: { partNumber: command.partNumber },
      update: { description: command.description },
      create: {
        partNumber: command.partNumber,
        name: command.partNumber,
        description: command.description,
        type: 'ASSEMBLY',
      },
    });

    const bom = await this.prisma.bomVersion.create({
      data: {
        itemId: item.id,
        revision: command.revision,
        description: command.description,
        status: 'DRAFT',
      },
    });

    const savedComponents: any[] = [];
    for (const comp of command.components || []) {
      let childItemId = comp.childItemId;
      if (!childItemId && comp.childPartNumber) {
        const child = await this.prisma.item.findUnique({ where: { partNumber: comp.childPartNumber } });
        childItemId = child?.id;
      }
      if (!childItemId) continue;
      const row = await this.prisma.bomComponent.create({
        data: {
          bomVersionId: bom.id,
          parentItemId: item.id,
          childItemId,
          quantity: comp.quantity ?? 1,
          position: comp.position ?? savedComponents.length + 1,
          scrapFactor: comp.scrapFactor ?? 0,
        },
        include: { childItem: true },
      });
      savedComponents.push({
        childItemId: row.childItemId,
        childPartNumber: row.childItem?.partNumber,
        quantity: row.quantity,
        position: row.position,
        scrapFactor: row.scrapFactor,
      });
    }

    console.log(`[PLM] Created BOM version ${bom.revision} for part ${command.partNumber}`);
    return {
      id: bom.id,
      partNumber: command.partNumber,
      description: command.description,
      revision: bom.revision,
      status: bom.status,
      components: savedComponents,
    };
  }
}
