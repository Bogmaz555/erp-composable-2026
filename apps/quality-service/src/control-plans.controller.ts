import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { calcSampleSize, calcAcceptReject, evaluateAql } from './aql-calculator';
import { randomUUID } from 'crypto';

@Controller()
export class ControlPlansController {
  constructor(private readonly prisma: PrismaService) {}

  private async seedDefaults() {
    const count = await this.prisma.controlPlan.count();
    if (count > 0) return;
    const defaults = [
      { sku: 'M-001', name: 'Kontrola materiału wejściowego', inspectionType: 'INBOUND', characteristics: [{ name: 'Wymiary', method: 'Suwmiarka', spec: '±0.1mm' }] },
      { sku: 'M-002', name: 'Kontrola w procesie — spawanie', inspectionType: 'IN_PROCESS', characteristics: [{ name: 'Penetracja', method: 'VT', spec: 'ISO 5817 B' }] },
      { sku: 'FG-001', name: 'Kontrola końcowa maszyny', inspectionType: 'FINAL', characteristics: [{ name: 'FAT protokół', method: 'Checklist', spec: '100% punktów OK' }] },
    ];
    for (const d of defaults) {
      await this.prisma.controlPlan.create({
        data: { id: randomUUID(), ...d, aqlLevel: 'II', characteristics: d.characteristics as object },
      });
    }
  }

  @Get('control-plans')
  async list() {
    await this.seedDefaults();
    return this.prisma.controlPlan.findMany({
      where: { isActive: true },
      orderBy: { sku: 'asc' },
      include: { samples: { take: 3, orderBy: { createdAt: 'desc' } } },
    });
  }

  @Post('control-plans')
  async create(@Body() body: {
    sku: string; name: string; inspectionType: string; aqlLevel?: string; characteristics?: object[];
  }) {
    return this.prisma.controlPlan.create({
      data: {
        id: randomUUID(),
        sku: body.sku,
        name: body.name,
        inspectionType: body.inspectionType,
        aqlLevel: body.aqlLevel ?? 'II',
        characteristics: body.characteristics ?? [],
      },
    });
  }

  @Get('aql/samples')
  async listSamples() {
    return this.prisma.aqlSample.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { controlPlan: true },
    });
  }

  /** Uruchom próbkowanie AQL dla partii */
  @Post('aql/run')
  async runAql(@Body() body: { controlPlanId: string; lotSize: number; referenceId?: string }) {
    const plan = await this.prisma.controlPlan.findUnique({ where: { id: body.controlPlanId } });
    if (!plan) throw new Error('Plan kontroli nie istnieje');

    const sampleSize = calcSampleSize(body.lotSize);
    const { acceptNumber, rejectNumber } = calcAcceptReject(sampleSize);

    return this.prisma.aqlSample.create({
      data: {
        id: randomUUID(),
        controlPlanId: plan.id,
        referenceId: body.referenceId,
        lotSize: body.lotSize,
        sampleSize,
        acceptNumber,
        rejectNumber,
        result: 'PENDING',
      },
      include: { controlPlan: true },
    });
  }

  /** Zarejestruj wynik inspekcji próbki */
  @Patch('aql/samples/:id/record')
  async recordSample(
    @Param('id') id: string,
    @Body() body: { inspected: number; defects: number; notes?: string },
  ) {
    const sample = await this.prisma.aqlSample.findUnique({ where: { id } });
    if (!sample) throw new Error('Próbka AQL nie istnieje');

    const result = evaluateAql(body.defects, sample.acceptNumber, sample.rejectNumber);
    return this.prisma.aqlSample.update({
      where: { id },
      data: {
        inspected: body.inspected,
        defects: body.defects,
        result,
        notes: body.notes,
      },
      include: { controlPlan: true },
    });
  }
}
