import { Controller, Logger, Post, Body } from '@nestjs/common';
import { EventPattern, Payload, Ctx, NatsContext } from '@nestjs/microservices';
import { CommandBus } from '@nestjs/cqrs';
import type { PlmBomReleasedV2Event } from '@erp/shared-kernel';
import { assertEtoOperationalPayload } from '@erp/shared-kernel';
import { AddWbsElementCommand } from './commands/add-wbs-element.command';
import { RequestMaterialCommand } from './commands/request-material.handler';
import { LinkProjectBomCommand } from './commands/link-project-bom.command';

/**
 * Event-driven PLM → PM integration (ETO).
 * Primary: @EventPattern('plm.bom.released.v2') via NATS.
 * Legacy/demo: POST plm-integration/bom-released (delegates to same handler).
 */
@Controller()
export class PlmIntegrationController {
  private readonly logger = new Logger(PlmIntegrationController.name);

  constructor(private readonly commandBus: CommandBus) {}

  @EventPattern('plm.bom.released.v2')
  async handleBomReleased(@Payload() payload: PlmBomReleasedV2Event, @Ctx() context: NatsContext) {
    const hdrs = context.getHeaders();
    const userId = (hdrs?.['x-user-id'] as string) || payload.releasedBy || 'system';
    const roles = (hdrs?.['x-roles'] as string) || '';
    if (userId !== 'system') {
      this.logger.log(`[TD-001] plm.bom.released.v2 → PM explosion by user=${userId} roles=${roles}`);
    }
    return this.processBomReleased(payload, userId);
  }

  /** @deprecated Use NATS plm.bom.released.v2 — kept for manual/demo triggers */
  @Post('plm-integration/bom-released')
  async onBomReleasedHttp(@Body() payload: PlmBomReleasedV2Event) {
    this.logger.warn('[PM] HTTP bom-released — prefer NATS EventPattern in production');
    return this.processBomReleased(payload, payload.releasedBy || 'http-demo');
  }

  private async processBomReleased(payload: PlmBomReleasedV2Event, actorId: string) {
    this.logger.debug(
      `[PM] plm.bom.released.v2 — WBS + material requests for BOM ${payload.bomVersionId}`,
    );

    if (payload.projectId) {
      assertEtoOperationalPayload(
        { projectId: payload.projectId, tenantId: payload.tenantId, bomComponentId: payload.bomVersionId },
        'plm.bom.released.v2',
      );
    }

    const projectId = payload.projectId || 'default-project';
    const tenantId = payload.tenantId || 'default';

    if (payload.bomVersionId && projectId !== 'default-project') {
      await this.commandBus.execute(new LinkProjectBomCommand(projectId, payload.bomVersionId, tenantId));
      this.logger.log(`[PM] Project ${projectId} linked to bomVersion ${payload.bomVersionId}`);
    }

    let productionWbsId: string | undefined = undefined;
    if (payload.itemId && payload.components?.length) {
      const wbs = await this.commandBus.execute(
        new AddWbsElementCommand(
          projectId,
          `Production - BOM ${payload.revision || ''} (${payload.components.length} components)`,
          'PRODUCTION',
          undefined,
        ),
      );
      productionWbsId = (wbs as { id?: string })?.id || undefined;
    }

    let componentsProcessed = 0;
    if (payload.components && Array.isArray(payload.components)) {
      for (const comp of payload.components) {
        const bomComponentId = comp.bomComponentId || null;
        const itemId = comp.childItemId;
        const qty = comp.quantity || 1;

        if (!itemId) continue;

        await this.commandBus.execute(
          new AddWbsElementCommand(
            projectId,
            `Material: ${comp.childPartNumber || itemId} (qty ${qty})`,
            'MATERIAL',
            productionWbsId,
          ),
        );

        try {
          await this.commandBus.execute(
            new RequestMaterialCommand(
              productionWbsId || projectId,
              itemId,
              qty,
              bomComponentId ?? undefined,
              tenantId,
            ),
          );
          componentsProcessed++;
        } catch (e) {
          this.logger.warn(`[PM] RequestMaterial failed for ${itemId}: ${(e as Error).message}`);
        }
      }
    }

    return {
      status: 'project-structures-updated',
      actorId,
      bomVersionId: payload.bomVersionId,
      projectId,
      componentsProcessed,
    };
  }
}
