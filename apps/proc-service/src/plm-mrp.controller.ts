import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import type { PlmBomReleasedV2Event } from '@erp/shared-kernel';
import { CommandBus } from '@nestjs/cqrs';
import { CreatePurchaseOrderCommand } from './commands/create-purchase-order.handler';
import { LongLeadRadarService } from './long-lead-radar.service';
import { MrpNettingService } from './mrp-netting.service';

/**
 * MRP light: na podstawie released BOM generuj szkice PO dla brakujących komponentów zakupowych.
 */
@Controller()
export class PlmMrpController {
  private readonly logger = new Logger(PlmMrpController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly radar: LongLeadRadarService,
    private readonly netting: MrpNettingService,
  ) {}

  @EventPattern('plm.bom.released.v2')
  async handleBomReleased(@Payload() payload: PlmBomReleasedV2Event) {
    if (!payload.components?.length) return;

    const projectId = payload.projectId;
    const tenantId = payload.tenantId || 'default';
    let created = 0;

    // Najpierw odpalamy netting by wiedzieć, co faktycznie potrzebujemy
    const { lines } = await this.netting.computeNetting(projectId);

    for (const comp of payload.components) {
      const sku = comp.childPartNumber || comp.childItemId;
      if (!sku) continue;

      const leadDays = await this.radar.resolveLeadTimeDays(sku, tenantId);
      if (this.radar.isLongLead(leadDays)) continue;

      const netLine = lines.find((l) => l.sku === sku);
      const netQty = netLine?.netRequirement || 0;
      
      if (netQty > 0) {
        await this.commandBus.execute(
          new CreatePurchaseOrderCommand(sku, Math.ceil(netQty), {
            projectId,
            bomComponentId: comp.bomComponentId,
            itemId: comp.childItemId,
            tenantId,
            source: 'MRP',
          }),
        );
        created++;
      }
    }

    this.logger.log(
      `[PROC MRP] ${created} draft PO(s) from BOM ${payload.bomVersionId} project=${projectId || 'N/A'} (Netting applied)`,
    );
    return { created };
  }
}
