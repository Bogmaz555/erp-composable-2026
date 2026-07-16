import { Controller, Post, Body, Param } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { RaiseAndonNcrCommand } from '../commands/raise-andon-ncr.handler';

@Controller('mes/andon')
export class MesAndonController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('ncr')
  raiseNcr(
    @Body()
    dto: {
      operationId: string;
      defectCode: string;
      description: string;
      attachmentIds?: string[];
      operatorId?: string;
    },
  ) {
    return this.commandBus.execute(
      new RaiseAndonNcrCommand(
        dto.operationId,
        dto.defectCode,
        dto.description,
        dto.attachmentIds || [],
        dto.operatorId,
      ),
    );
  }
}
