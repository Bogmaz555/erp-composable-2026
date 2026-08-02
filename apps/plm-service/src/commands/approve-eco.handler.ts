import { randomUUID } from 'crypto';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  assertValidEventPayload,
  isEnterpriseProfile,
} from '@erp/shared-kernel';
import { PrismaService } from '../prisma.service';
import { ReleaseBomVersionCommand } from './release-bom-version.command';
import { CommandBus } from '@nestjs/cqrs';

export class ApproveEcoCommand {
  constructor(
    public readonly ecoId: string,
    public readonly approvedBy?: string,
    /** When true, re-release affected BOM versions (event-only). Default true. */
    public readonly rereleaseBoms: boolean = true,
  ) {}
}

@CommandHandler(ApproveEcoCommand)
export class ApproveEcoHandler implements ICommandHandler<ApproveEcoCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commandBus: CommandBus,
  ) {}

  private parseAffectedBoms(raw: unknown): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === 'string');
    return [];
  }

  async execute(command: ApproveEcoCommand) {
    const eco = await this.prisma.engineeringChangeOrder.findUnique({
      where: { id: command.ecoId },
    });
    if (!eco) throw new Error('ECO not found');
    if (eco.status === 'REJECTED') throw new Error('ECO is REJECTED');
    if (eco.status === 'IMPLEMENTED') {
      return { eco, alreadyImplemented: true, releasedBomVersionIds: [] as string[] };
    }

    const affected = this.parseAffectedBoms(eco.affectedBoms);
    const correlationId = randomUUID();
    const approvedBy = command.approvedBy || 'system';
    const approvedAt = new Date().toISOString();

    const payload = {
      ecoId: eco.id,
      ecoNumber: eco.ecoNumber,
      title: eco.title,
      affectedBomVersionIds: affected,
      approvedBy,
      approvedAt,
      correlationId,
    };

    if (isEnterpriseProfile()) {
      assertValidEventPayload('plm.eco.approved.v1', payload);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.engineeringChangeOrder.update({
        where: { id: eco.id },
        data: { status: 'APPROVED', updatedAt: new Date() },
      });
      await tx.outboxEvent.create({
        data: {
          aggregateId: eco.id,
          aggregateType: 'EngineeringChangeOrder',
          eventType: 'plm.eco.approved.v1',
          payload,
          status: 'PENDING',
        },
      });
    });

    const releasedBomVersionIds: string[] = [];
    if (command.rereleaseBoms) {
      for (const bomVersionId of affected) {
        try {
          await this.commandBus.execute(
            new ReleaseBomVersionCommand(bomVersionId, approvedBy),
          );
          releasedBomVersionIds.push(bomVersionId);
        } catch (e) {
          console.warn(
            `[PLM] ECO ${eco.ecoNumber} re-release failed for ${bomVersionId}: ${(e as Error).message}`,
          );
        }
      }
      await this.prisma.engineeringChangeOrder.update({
        where: { id: eco.id },
        data: {
          status: releasedBomVersionIds.length ? 'IMPLEMENTED' : 'APPROVED',
          updatedAt: new Date(),
        },
      });
    }

    const updated = await this.prisma.engineeringChangeOrder.findUnique({
      where: { id: eco.id },
    });
    return {
      eco: updated,
      releasedBomVersionIds,
      correlationId,
      eventType: 'plm.eco.approved.v1',
    };
  }
}
