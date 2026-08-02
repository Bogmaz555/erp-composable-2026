import { Controller, Get, Post, Body, Patch, Param, Req, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ETO_MUTATION_ROLES } from '@erp/shared-kernel';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';
import { GetBomTreeQuery } from './queries/get-bom-tree.query';
import { CreateBOMCommand } from './commands/create-bom.handler';
import { CreateECOCommand } from './commands/create-eco.handler';
import { ApproveEcoCommand } from './commands/approve-eco.handler';
import { GetBOMsQuery } from './queries/get-boms.handler';
import { GetECOsQuery } from './queries/get-ecos.handler';
import { ReleaseBomVersionCommand } from './commands/release-bom-version.command';
import { AddBomComponentCommand } from './commands/add-bom-component.command';
import { CreateBomVersionCommand } from './commands/create-bom-version.command';
import { LinkSubBomCommand } from './commands/link-sub-bom.command';
import { DoubleBomService } from './double-bom.service';
import { EcoImpactService } from './eco-impact.service';

// Legacy controllers kept for backward compatibility during migration
@Controller('boms')
export class PlmBomController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly doubleBom: DoubleBomService,
  ) {}

  @Get()
  async getBoms() {
    return this.queryBus.execute(new GetBOMsQuery());
  }

  @Post()
  async createBom(@Body() body: { partNumber: string, description: string, revision: string, components: any[] }) {
    return this.commandBus.execute(new CreateBOMCommand(body.partNumber, body.description, body.revision, body.components || []));
  }

  /** Public read — smoke/regression (no JWT required) */
  @Get('versions/:id/double-bom')
  async getDoubleBomPublic(@Param('id') bomVersionId: string) {
    return this.doubleBom.status(bomVersionId);
  }

  /** W51 — full multi-level explosion (SAP-deep PLM) */
  @Get('versions/:id/explosion')
  async getExplosionPublic(@Param('id') bomVersionId: string) {
    const lines = await this.doubleBom.explodeBomVersion(bomVersionId);
    return {
      bomVersionId,
      count: lines.length,
      leafCount: lines.filter((l) => !l.isSubAssembly).length,
      maxLevel: lines.reduce((m, l) => Math.max(m, l.bomLevel), 0),
      lines,
    };
  }
}

@Controller('ecos')
export class PlmEcoController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly ecoImpact: EcoImpactService,
  ) {}

  @Get()
  async getEcos() {
    return this.queryBus.execute(new GetECOsQuery());
  }

  @Post()
  async createEco(@Body() body: { title: string, description: string, bomId?: string }) {
    return this.commandBus.execute(new CreateECOCommand(body.title, body.description, body.bomId));
  }

  /** W51 — ECO impact analysis (affected BOM explosion summary) */
  @Get(':id/impact')
  async getEcoImpact(@Param('id') id: string) {
    return this.ecoImpact.analyze(id);
  }

  /**
   * Q1 E1.1 — Approve ECO (event-only write path).
   * Emits plm.eco.approved.v1 via outbox; optionally re-releases affected BOMs
   * (plm.bom.released.v2) without HTTP to peers.
   */
  @Post(':id/approve')
  async approveEco(
    @Param('id') id: string,
    @Body() body: { approvedBy?: string; rereleaseBoms?: boolean },
    @Req() req: any,
  ) {
    const approvedBy = body?.approvedBy || req?.user?.id || 'system';
    return this.commandBus.execute(
      new ApproveEcoCommand(id, approvedBy, body?.rereleaseBoms !== false),
    );
  }
}

// Item Master (Kartoteka Produktów) jest obsługiwana przez ProductController (product.controller.ts).

@Controller('bom-versions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlmBomVersionsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly doubleBom: DoubleBomService,
  ) {}

  @Post()
  @Roles(...ETO_MUTATION_ROLES.PLM_BOM_RELEASE)
  async createBomVersion(@Body() body: any) {
    return this.commandBus.execute(new CreateBomVersionCommand(
      body.itemId,
      body.revision,
      body.description,
      body.effectivityFrom ? new Date(body.effectivityFrom) : undefined,
      body.effectivityTo ? new Date(body.effectivityTo) : undefined,
    ));
  }

  @Patch(':id/release')
  @Roles(...ETO_MUTATION_ROLES.PLM_BOM_RELEASE)
  async releaseBomVersion(@Param('id') id: string, @Body() body: { releasedBy?: string }, @Req() req: any) {
    const user = req.user || {};
    const releasedBy = body.releasedBy || user.id || 'system';

    // TD-001: claim usage + RolesGuard (ETO matrix PLM_BOM_RELEASE)
    if (user.id) {
      console.log(`[TD-001] BOM release initiated by user=${user.id} roles=${user.roles || []}`);
    }

    return this.commandBus.execute(new ReleaseBomVersionCommand(id, releasedBy));
  }

  @Post(':id/components')
  async addComponent(@Param('id') bomVersionId: string, @Body() body: any) {
    return this.commandBus.execute(new AddBomComponentCommand(
      bomVersionId,
      body.childItemId,
      body.quantity,
      body.position,
      body.scrapFactor,
    ));
  }

  @Get(':id/tree')
  async getBomTree(@Param('id') bomVersionId: string) {
    return this.queryBus.execute(new GetBomTreeQuery(bomVersionId));
  }

  @Get(':id/double-bom')
  async getDoubleBomStatus(@Param('id') bomVersionId: string) {
    return this.doubleBom.status(bomVersionId);
  }

  @Patch(':id/components/:componentId/link-sub-bom')
  async linkSubBom(
    @Param('id') bomVersionId: string,
    @Param('componentId') componentId: string,
    @Body() body: { subBomVersionId: string },
  ) {
    return this.commandBus.execute(
      new LinkSubBomCommand(bomVersionId, componentId, body.subBomVersionId),
    );
  }
}
