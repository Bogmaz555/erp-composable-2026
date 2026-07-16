import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma.service';

export class GetBOMsQuery {}

@QueryHandler(GetBOMsQuery)
export class GetBOMsHandler implements IQueryHandler<GetBOMsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    const versions = await this.prisma.bomVersion.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        item: true,
        components: { include: { childItem: true } },
      },
    });

    // Map new BomVersion model back to the legacy "BOM" shape consumed by the frontend.
    return versions.map((bv) => ({
      id: bv.id,
      partNumber: bv.item?.partNumber ?? '',
      description: bv.description ?? bv.item?.description ?? '',
      revision: bv.revision,
      status: bv.status,
      createdAt: bv.createdAt,
      components: bv.components.map((c) => ({
        childItemId: c.childItemId,
        childPartNumber: c.childItem?.partNumber,
        quantity: c.quantity,
        position: c.position,
        scrapFactor: c.scrapFactor,
      })),
    }));
  }
}
