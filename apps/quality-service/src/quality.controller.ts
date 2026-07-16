import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { EventPattern, Payload } from '@nestjs/microservices';
import { CreateInspectionCommand } from './commands/create-inspection.handler';
import { UpdateInspectionResultCommand } from './commands/update-inspection-result.handler';
import { CreateNcrCommand } from './commands/create-ncr.handler';
import { CloseNcrCommand } from './commands/close-ncr.handler';
import { CreateCapaCommand } from './commands/create-capa.handler';
import { UpdateCapaStatusCommand, CapaStatus } from './commands/update-capa-status.handler';
import { GetInspectionsQuery } from './queries/get-inspections.handler';
import { GetNcrsQuery } from './queries/get-ncrs.handler';
import { GetCapaQuery } from './queries/get-capa.handler';

@Controller()
export class QualityController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @EventPattern('proc.material.received.v1')
  handleMaterialReceived(
    @Payload() event: { purchaseOrderId: string; sku: string; projectId?: string },
  ) {
    return this.commandBus.execute(
      new CreateInspectionCommand(
        event.purchaseOrderId,
        'INBOUND',
        'PENDING',
        `Inbound inspection for SKU ${event.sku}`,
      ),
    );
  }

  @EventPattern('mes.workorder.completed.v1')
  handleWorkOrderCompleted(@Payload() event: { workOrderId: string }) {
    return this.commandBus.execute(
      new CreateInspectionCommand(event.workOrderId, 'FINAL', 'PENDING'),
    );
  }

  @EventPattern('mes.ncr.raised.v1')
  handleMesNcrRaised(
    @Payload()
    event: {
      workOrderId: string;
      operationId: string;
      defectCode: string;
      defectDescription: string;
      attachmentIds?: string[];
      projectId?: string;
    },
  ) {
    return this.commandBus.execute(
      new CreateNcrCommand(event.defectDescription, 'HIGH', {
        defectCode: event.defectCode,
        attachmentIds: event.attachmentIds,
        projectId: event.projectId,
        workOrderId: event.workOrderId,
      }),
    );
  }

  @Get('inspections')
  getInspections() {
    return this.queryBus.execute(new GetInspectionsQuery());
  }

  @Post('inspections')
  createInspection(@Body() dto: { referenceId: string; type: string; status?: string; notes?: string }) {
    return this.commandBus.execute(
      new CreateInspectionCommand(dto.referenceId, dto.type, dto.status, dto.notes),
    );
  }

  @Patch('inspections/:id/result')
  updateInspectionResult(
    @Param('id') id: string,
    @Body() dto: { result: 'PASSED' | 'FAILED'; notes?: string; evaluatedBy?: string },
  ) {
    return this.commandBus.execute(
      new UpdateInspectionResultCommand(id, dto.result, dto.notes, dto.evaluatedBy),
    );
  }

  @Get('ncrs')
  getNcrs() {
    return this.queryBus.execute(new GetNcrsQuery());
  }

  @Post('ncrs')
  createNcr(
    @Body()
    dto: {
      inspectionId?: string;
      defectCode?: string;
      defectDescription: string;
      attachmentIds?: string[];
      severity: string;
      projectId?: string;
      workOrderId?: string;
      bomComponentId?: string;
    },
  ) {
    return this.commandBus.execute(
      new CreateNcrCommand(dto.defectDescription, dto.severity, {
        inspectionId: dto.inspectionId,
        defectCode: dto.defectCode,
        attachmentIds: dto.attachmentIds,
        projectId: dto.projectId,
        workOrderId: dto.workOrderId,
        bomComponentId: dto.bomComponentId,
      }),
    );
  }

  @Patch('ncrs/:id/close')
  closeNcr(
    @Param('id') id: string,
    @Body() dto: { disposition: string; closedBy?: string },
  ) {
    return this.commandBus.execute(
      new CloseNcrCommand(id, dto.disposition, dto.closedBy),
    );
  }

  @Get('capa')
  getCapa() {
    return this.queryBus.execute(new GetCapaQuery());
  }

  @Get('ncrs/:id/capa')
  getCapaForNcr(@Param('id') id: string) {
    return this.queryBus.execute(new GetCapaQuery(id));
  }

  @Post('ncrs/:id/capa')
  createCapa(
    @Param('id') ncrId: string,
    @Body()
    dto: {
      description: string;
      type?: 'CORRECTIVE' | 'PREVENTIVE';
      rootCause?: string;
      assignee?: string;
      dueDate?: string;
    },
  ) {
    return this.commandBus.execute(
      new CreateCapaCommand(ncrId, dto.description, dto.type || 'CORRECTIVE', {
        rootCause: dto.rootCause,
        assignee: dto.assignee,
        dueDate: dto.dueDate,
      }),
    );
  }

  @Patch('capa/:id/status')
  updateCapaStatus(
    @Param('id') id: string,
    @Body() dto: { status: CapaStatus; rootCause?: string },
  ) {
    return this.commandBus.execute(
      new UpdateCapaStatusCommand(id, dto.status, dto.rootCause),
    );
  }
}
