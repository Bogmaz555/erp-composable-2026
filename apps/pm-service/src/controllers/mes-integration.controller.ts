import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { CommandBus } from '@nestjs/cqrs';
import { ApplyNcrDelayCommand } from '../commands/apply-ncr-delay.handler';

@Controller()
export class MesIntegrationController {
  constructor(private readonly commandBus: CommandBus) {}

  @EventPattern('mes.ncr.raised.v1')
  handleMesNcrRaised(
    @Payload()
    event: {
      projectId: string;
      workOrderId: string;
      defectCode: string;
    },
  ) {
    if (!event.projectId) {
      return; // Brak referencji ETO - maszyna seryjna (MTS) zignorowana w kontekście PM
    }
    
    return this.commandBus.execute(
      new ApplyNcrDelayCommand(event.projectId, event.workOrderId, event.defectCode)
    );
  }
}
