import { Controller, Get, Post, Body } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { CommandBus } from '@nestjs/cqrs';
import { RecordTimeEntryCommand } from './commands/record-time-entry.command';
import { PrismaService } from './prisma.service';

@Controller('hr')
export class HrController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly prisma: PrismaService,
  ) {}

  @Get('health')
  health() {
    return { status: 'HR Service running' };
  }

  @Get('employees')
  async listEmployees() {
    const employees = await this.prisma.employee.findMany({
      where: { isActive: true },
      take: 50,
    });
    // Decimal → number so FE emp.hourlyRate.toFixed(2) works (JSON Decimal is string)
    return employees.map((e) => ({ ...e, hourlyRate: Number(e.hourlyRate) }));
  }

  @Post('time-entries')
  async recordTime(
    @Body()
    body: {
      employeeId: string;
      projectId: string;
      hours: number;
      workOrderId?: string;
      tenantId?: string;
    },
  ) {
    return this.commandBus.execute(
      new RecordTimeEntryCommand(
        body.employeeId,
        body.projectId,
        body.hours,
        body.workOrderId,
        body.tenantId,
      ),
    );
  }

  @MessagePattern('hr.employee.validateSkills')
  async validateSkills(data: { badgeId: string; requiredCertifications: string[] }) {
    const employee = await this.prisma.employee.findUnique({
      where: { badgeId: data.badgeId },
      include: { certifications: true },
    });

    if (!employee) {
      return { isValid: false, reason: 'EMPLOYEE_NOT_FOUND' };
    }
    if (!employee.isActive) {
      return { isValid: false, reason: 'EMPLOYEE_INACTIVE' };
    }

    const now = new Date();
    const missing = [];
    const expired = [];

    for (const req of data.requiredCertifications) {
      const cert = employee.certifications.find(c => c.name === req);
      if (!cert) {
        missing.push(req);
      } else if (cert.validUntil < now) {
        expired.push(req);
      }
    }

    if (missing.length > 0 || expired.length > 0) {
      return {
        isValid: false,
        reason: 'CERTIFICATION_FAILED',
        missing,
        expired,
      };
    }

    return {
      isValid: true,
      employeeId: employee.id,
      // Decimal → number for MES labor math (KD-5 money at rest is Decimal)
      hourlyRate: Number(employee.hourlyRate),
    };
  }

  @MessagePattern('hr.employee.getDetails')
  async getEmployeeDetails(data: { employeeId: string }) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: data.employeeId },
    });
    if (!employee) return null;
    return { hourlyRate: Number(employee.hourlyRate) };
  }
}
