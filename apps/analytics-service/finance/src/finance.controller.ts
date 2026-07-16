import { Controller, Get, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { CommandBus } from '@nestjs/cqrs';
import { RecordTransactionCommand } from './commands/record-transaction.handler';

@Controller('fin')
export class FinanceController {
  private readonly logger = new Logger(FinanceController.name);

  constructor(private readonly commandBus: CommandBus) {}

  @Get('health')
  getHealth() {
    return { status: 'Finance Service is running' };
  }

  @EventPattern('procurement.order.approved')
  async handleProcurementOrderApproved(@Payload() data: { orderId: string, totalAmount: number }) {
    this.logger.log(`Received procurement.order.approved for Order ${data.orderId}`);
    
    // W systemie produkcyjnym najpierw wyszukujemy konto powiązane z danym dostawcą lub magazynem.
    // Dla uproszczenia (POC) zakładamy twardo wpisane ID konta lub tworzymy w locie.
    // Tutaj zakładamy, że zatwierdzone zamówienie generuje zobowiązanie (CREDIT) na koncie 'Zobowiązania wobec dostawców'.
    
    // W normalnym przypadku używamy query by pobrać ID konta. Tutaj mockujemy dla pełnego CQRS:
    await this.commandBus.execute(
      new RecordTransactionCommand(
        'mock-liability-account-id',
        data.totalAmount,
        'CREDIT',
        data.orderId,
        'PROCUREMENT',
        `Zobowiązanie z tytułu zamówienia ${data.orderId}`
      )
    );
  }

  @Get('payables')
  getPayables() {
    // Zwracamy przykładowe dane (zobowiązania)
    return [
      {
        id: 'PAY-001',
        vendor: 'TechSupplies Inc.',
        amount: 15400.00,
        currency: 'PLN',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'PENDING',
        orderRef: 'PO-2026-0042',
      },
      {
        id: 'PAY-002',
        vendor: 'SteelWorks Ltd.',
        amount: 8250.50,
        currency: 'PLN',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'OVERDUE',
        orderRef: 'PO-2026-0039',
      },
      {
        id: 'PAY-003',
        vendor: 'Elektronika PL',
        amount: 4100.00,
        currency: 'PLN',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'PENDING',
        orderRef: 'PO-2026-0045',
      }
    ];
  }

  @Get('receivables')
  getReceivables() {
    // Zwracamy przykładowe dane (należności)
    return [
      {
        id: 'REC-001',
        client: 'GlobalTech Corp',
        amount: 32000.00,
        currency: 'PLN',
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'PENDING',
        invoiceRef: 'INV-2026-0102',
      },
      {
        id: 'REC-002',
        client: 'AutoMotive Gmbh',
        amount: 145000.00,
        currency: 'PLN',
        dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'OVERDUE',
        invoiceRef: 'INV-2026-0098',
      },
      {
        id: 'REC-003',
        client: 'Solaris Systems',
        amount: 9800.00,
        currency: 'PLN',
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'PENDING',
        invoiceRef: 'INV-2026-0105',
      }
    ];
  }
}
