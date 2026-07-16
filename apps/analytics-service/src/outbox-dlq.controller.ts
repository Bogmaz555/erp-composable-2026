import { Controller, Get } from '@nestjs/common';
import { OutboxDlqService } from './outbox-dlq.service';

@Controller('outbox')
export class OutboxDlqController {
  constructor(private readonly dlq: OutboxDlqService) {}

  @Get('dead-letter')
  async deadLetter() {
    return this.dlq.summary();
  }
}
