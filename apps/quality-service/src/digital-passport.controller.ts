import { Controller, Get, Param, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from './prisma/prisma.service';
import { firstValueFrom } from 'rxjs';

@Controller('quality/passport')
export class DigitalPassportController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('NATS_CLIENT') private readonly natsClient: ClientProxy,
  ) {}

  @Get(':workOrderId')
  async getMachinePassport(@Param('workOrderId') workOrderId: string) {
    // 1. Pobranie danych jakościowych z lokalnej bazy (QMS)
    const ncrs = await this.prisma.nonConformanceReport.findMany({
      where: { workOrderId },
    });

    const inspections = await this.prisma.inspection.findMany({
      where: { referenceId: workOrderId },
    });

    // 2. Pobranie danych "As-Built" (Genealogia) z MES przez NATS (RPC)
    let asBuiltData = null;
    try {
      const response = await firstValueFrom(
        this.natsClient.send('mes.get_as_built.v1', { workOrderId })
      );
      if (response && response.found) {
        asBuiltData = response.records;
      }
    } catch (err) {
      console.warn(`[DigitalPassport] Błąd komunikacji NATS z MES: ${err.message}`);
    }

    // 3. Budowanie spójnego Paszportu Maszyny
    return {
      workOrderId,
      generatedAt: new Date().toISOString(),
      status: ncrs.every(ncr => ncr.status === 'CLOSED') && inspections.every(i => i.status === 'PASSED')
        ? 'COMPLIANT'
        : 'NON_COMPLIANT',
      machineGenealogy: asBuiltData || [],
      qualityRecords: {
        inspections,
        ncrs,
      },
    };
  }
}
