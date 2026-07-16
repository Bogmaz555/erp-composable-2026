import { Currency } from '.prisma/client-crm';

export class CreateLeadCommand {
  constructor(
    public readonly companyName: string,
    public readonly nip: string,
    public readonly email: string,
    public readonly title: string,
    public readonly estimatedValue: number,
    public readonly currency: Currency,
  ) {}
}
