import { Controller, Get } from '@nestjs/common';
import { MailerService } from './mailer.service';

@Controller()
export class MailerController {
  constructor(private readonly mailer: MailerService) {}

  @Get('mail/outbox')
  outbox() {
    return this.mailer.getOutbox();
  }
}
