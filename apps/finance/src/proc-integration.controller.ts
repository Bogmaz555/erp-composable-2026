import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import type { PurchaseOrderApprovedEvent } from '@erp/shared-kernel';
import { CommandBus } from '@nestjs/cqrs';
import { PrismaService } from './prisma.service';
import { bookProcurementCommitment } from './proc-commitment';

@Controller()
export class ProcIntegrationController {
  private readonly logger = new Logger(ProcIntegrationController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commandBus: CommandBus,
  ) {}

  @EventPattern('proc.purchaseorder.approved.v1')
  async handlePoApproved(@Payload() payload: PurchaseOrderApprovedEvent) {
    await bookProcurementCommitment(
      this.prisma,
      this.commandBus,
      payload,
      this.logger,
    );
  }
}
