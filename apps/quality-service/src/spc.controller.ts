import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { calcControlLimits, calcCapability } from './spc-calculator';
import { randomUUID } from 'crypto';

@Controller()
export class SpcController {
  constructor(private readonly prisma: PrismaService) {}

  private async seedDefaults() {
    const count = await this.prisma.spcCharacteristic.count();
    if (count > 0) return;
    const defaults = [
      { sku: 'M-001', name: 'Średnica wału', unit: 'mm', target: 50.0, usl: 50.2, lsl: 49.8 },
      { sku: 'M-002', name: 'Siła spoiny', unit: 'kN', target: 12.0, usl: 14.0, lsl: 10.0 },
      { sku: 'FG-001', name: 'Hałas maszyny', unit: 'dB', target: 72.0, usl: 80.0, lsl: 65.0 },
    ];
    for (const d of defaults) {
      await this.prisma.spcCharacteristic.create({ data: { id: randomUUID(), ...d } });
    }
  }

  @Get('spc/characteristics')
  async listCharacteristics() {
    await this.seedDefaults();
    return this.prisma.spcCharacteristic.findMany({
      where: { isActive: true },
      orderBy: { sku: 'asc' },
      include: { measurements: { take: 5, orderBy: { measuredAt: 'desc' } } },
    });
  }

  @Post('spc/characteristics')
  async createCharacteristic(@Body() body: {
    sku: string; name: string; unit?: string; target?: number; usl?: number; lsl?: number;
  }) {
    return this.prisma.spcCharacteristic.create({
      data: {
        id: randomUUID(),
        sku: body.sku,
        name: body.name,
        unit: body.unit ?? 'mm',
        target: body.target,
        usl: body.usl,
        lsl: body.lsl,
      },
    });
  }

  @Get('spc/chart/:id')
  async getChart(@Param('id') id: string) {
    const char = await this.prisma.spcCharacteristic.findUnique({
      where: { id },
      include: { measurements: { orderBy: { measuredAt: 'asc' }, take: 100 } },
    });
    if (!char) throw new Error('Cecha SPC nie istnieje');

    const values = char.measurements.map((m) => m.value);
    const limits = calcControlLimits(values);
    const capability = calcCapability(values, char.usl, char.lsl);

    return {
      characteristic: {
        id: char.id,
        sku: char.sku,
        name: char.name,
        unit: char.unit,
        target: char.target,
        usl: char.usl,
        lsl: char.lsl,
      },
      limits: { ...limits, ...capability },
      points: char.measurements.map((m) => ({
        id: m.id,
        value: m.value,
        measuredAt: m.measuredAt,
        operatorId: m.operatorId,
        inControl: m.value >= limits.lcl && m.value <= limits.ucl,
      })),
    };
  }

  @Post('spc/measurements')
  async recordMeasurement(@Body() body: {
    characteristicId: string; value: number; operatorId?: string;
  }) {
    return this.prisma.spcMeasurement.create({
      data: {
        id: randomUUID(),
        characteristicId: body.characteristicId,
        value: body.value,
        operatorId: body.operatorId ?? 'operator',
      },
    });
  }
}
