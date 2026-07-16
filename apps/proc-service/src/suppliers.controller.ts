import { Controller, Get, Post, Body, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { randomUUID } from 'crypto';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    return this.prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  @Post()
  async create(@Body() body: {
    code: string; name: string; nip?: string; email?: string; currency?: string; leadTimeDays?: number;
  }) {
    if (!body.code?.trim() || !body.name?.trim()) {
      throw new BadRequestException('code i name są wymagane');
    }
    return this.prisma.supplier.create({
      data: {
        id: randomUUID(),
        code: body.code.trim().toUpperCase(),
        name: body.name.trim(),
        nip: body.nip ?? null,
        email: body.email ?? null,
        currency: body.currency ?? 'PLN',
        leadTimeDays: body.leadTimeDays ?? null,
      },
    });
  }
}
