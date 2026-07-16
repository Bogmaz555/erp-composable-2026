import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma.service';
import { CreateLeadCommand } from './create-lead.command';

@CommandHandler(CreateLeadCommand)
export class CreateLeadHandler implements ICommandHandler<CreateLeadCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateLeadCommand) {
    const { companyName, nip, email, title, estimatedValue, currency } = command;

    let customerId: string | undefined;

    if (nip && nip.trim() !== '') {
      const existing = await this.prisma.customer.findFirst({ where: { nip } });
      if (existing) customerId = existing.id;
    }

    if (!customerId && email && email.trim() !== '') {
      const existing = await this.prisma.customer.findFirst({ where: { email } });
      if (existing) customerId = existing.id;
    }

    if (!customerId) {
        const newCustomer = await this.prisma.customer.create({
            data: {
                name: companyName,
                nip: nip || null,
                email: email || null,
            }
        });
        customerId = newCustomer.id;
    }

    const opportunity = await this.prisma.opportunity.create({
      data: {
        title,
        value: estimatedValue ? parseFloat(estimatedValue.toString()) : 0,
        tkw: 0,
        currency: currency || 'PLN',
        status: 'NEW',
updatedAt: new Date(),
        customerId: customerId,
      }
    });

    return opportunity;
  }
}
