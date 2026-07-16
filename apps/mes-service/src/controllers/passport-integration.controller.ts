import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PrismaService } from '../prisma.service';

@Controller()
export class PassportIntegrationController {
  constructor(private readonly prisma: PrismaService) {}

  @MessagePattern('mes.get_as_built.v1')
  async getAsBuiltRecord(@Payload() data: { workOrderId: string }) {
    if (!data.workOrderId) {
      return { error: 'workOrderId is required' };
    }

    const records = await this.prisma.asBuiltRecord.findMany({
      where: { workOrderId: data.workOrderId },
      include: {
        asBuiltComponents: true,
      },
    });

    if (records.length === 0) {
      return { found: false, records: [] };
    }

    return {
      found: true,
      records,
    };
  }
}
