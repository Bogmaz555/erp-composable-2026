import { Controller, Post, Body, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '../prisma.service';
import { firstValueFrom } from 'rxjs';

@Controller('kiosk')
export class KioskController {
  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
    private readonly prisma: PrismaService,
  ) {}

  @Post('clock-in')
  async clockIn(@Body() body: { badgeId: string; operationId: string }) {
    // 1. Get Operation
    const operation = await this.prisma.operation.findUnique({
      where: { id: body.operationId },
    });
    if (!operation) {
      throw new HttpException('OPERATION_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    // 2. Validate Skills via HR
    const reqCerts = operation.requiredCertifications || [];
    const validationResult = await firstValueFrom(
      this.natsClient.send('hr.employee.validateSkills', {
        badgeId: body.badgeId,
        requiredCertifications: reqCerts,
      }),
    ).catch((err) => {
      throw new HttpException('HR_SERVICE_UNAVAILABLE', HttpStatus.SERVICE_UNAVAILABLE);
    });

    if (!validationResult.isValid) {
      throw new HttpException({
        message: 'SKILL_VALIDATION_FAILED',
        reason: validationResult.reason,
        missing: validationResult.missing,
        expired: validationResult.expired,
      }, HttpStatus.FORBIDDEN);
    }

    // 3. Create Session
    const session = await this.prisma.operatorSession.create({
      data: {
        operationId: operation.id,
        operatorId: validationResult.employeeId, // we store internal employee ID, not badge
        status: 'ACTIVE',
      },
    });

    // Update operation status if needed
    if (operation.status === 'PENDING') {
      await this.prisma.operation.update({
        where: { id: operation.id },
        data: { status: 'IN_PROGRESS', startedAt: new Date() },
      });
    }

    return {
      message: 'CLOCK_IN_SUCCESS',
      sessionId: session.id,
      operatorId: validationResult.employeeId,
      hourlyRate: validationResult.hourlyRate,
    };
  }

  @Post('clock-out')
  async clockOut(@Body() body: { sessionId: string }) {
    const session = await this.prisma.operatorSession.findUnique({
      where: { id: body.sessionId },
      include: { operation: { include: { workOrder: true } } },
    });

    if (!session || session.status !== 'ACTIVE') {
      throw new HttpException('INVALID_SESSION', HttpStatus.BAD_REQUEST);
    }

    const now = new Date();
    const durationMs = now.getTime() - session.startedAt.getTime();
    const durationMinutes = durationMs / (1000 * 60);

    await this.prisma.operatorSession.update({
      where: { id: session.id },
      data: { endedAt: now, status: 'COMPLETED' },
    });

    const employeeData = await firstValueFrom(
      this.natsClient.send('hr.employee.getDetails', { employeeId: session.operatorId })
    ).catch(() => null);

    const hourlyRate = employeeData?.hourlyRate || 50.0;
    const laborCost = (durationMinutes / 60) * hourlyRate;

    // Emit event to PM
    this.natsClient.emit('mes.labor.cost_recorded', {
      projectId: session.operation.workOrder?.projectId,
      workOrderId: session.operation.workOrderId,
      operationId: session.operationId,
      operatorId: session.operatorId,
      durationMinutes,
      hourlyRate,
      laborCost,
      recordedAt: now,
    });

    return {
      message: 'CLOCK_OUT_SUCCESS',
      durationMinutes,
      laborCost,
    };
  }
}
