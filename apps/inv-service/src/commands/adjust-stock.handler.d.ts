import { ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma.service';
export declare class AdjustStockCommand {
    readonly itemId: string;
    readonly quantity: number;
    constructor(itemId: string, quantity: number);
}
export declare class AdjustStockHandler implements ICommandHandler<AdjustStockCommand> {
    private readonly prisma;
    constructor(prisma: PrismaService);
    execute(command: AdjustStockCommand): Promise<{
        id: string;
        tenantId: string;
        createdAt: Date;
        itemId: string;
        quantity: number;
        updatedAt: Date;
        location: string | null;
    }>;
}
