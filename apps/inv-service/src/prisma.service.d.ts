import { OnModuleInit, INestApplication } from '@nestjs/common';
import { PrismaClient } from '.prisma/client-inv';
export declare class PrismaService extends PrismaClient implements OnModuleInit {
    constructor();
    onModuleInit(): Promise<void>;
    enableShutdownHooks(app: INestApplication): Promise<void>;
}
