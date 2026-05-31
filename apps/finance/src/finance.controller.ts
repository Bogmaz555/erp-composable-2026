import { Controller, Get, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, NatsContext } from '@nestjs/microservices';
import { CommandBus } from '@nestjs/cqrs';
import { RecordTransactionCommand } from './commands/record-transaction.handler';
import { PrismaService } from './prisma.service';

@Controller('fin')
export class FinanceController {
  private readonly logger = new Logger(FinanceController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly prisma: PrismaService,   // for real ProjectCost / WIP accounting (ETO)
  ) {}

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

  // TD-001 + Faza 1: Finance WIP listener on reservation release (closing the ETO loop)
  // Now extracts claims when available (NATS header propagation) and enriches audit description
  @EventPattern('inventory.reservation.released.v1')
  async handleReservationReleased(@Payload() data: { workOrderId: string, tenantId: string, releasedReservations: any[] }, @Ctx() context?: NatsContext) {
    const hdrs = context?.getHeaders?.() || {};
    const userId = (hdrs?.['x-user-id'] as string) || 'system';
    const roles = (hdrs?.['x-roles'] as string) || '';

    this.logger.log(`[Finance WIP] Received inventory.reservation.released.v1 for WO ${data.workOrderId} (user=${userId})`);

    if (userId !== 'system') {
      this.logger.log(`[TD-001] WIP relief processed by user=${userId} roles=${roles}`);
    }

    // In a real system we would look up the correct WIP account for the project/WO.
    // For now we record a simple WIP relief entry (DEBIT to WIP, CREDIT to inventory/expense).
    const totalReleased = data.releasedReservations?.reduce((sum: number, r: any) => sum + (r.quantity || 0), 0) || 0;

    if (totalReleased > 0) {
      const actor = userId !== 'system' ? ` by ${userId}` : '';
      await this.commandBus.execute(
        new RecordTransactionCommand(
          'mock-wip-account-id',
          totalReleased,
          'DEBIT', // Relief of WIP when materials are actually consumed/released
          data.workOrderId,
          'MANUFACTURING',
          `WIP relief for reservation release on WO ${data.workOrderId}${actor}`
        )
      );

      // === Faza 1 ETO: Real ProjectCost booking (actual material costing) ===
      // This moves Finance from stub to real project accounting on the traceability spine.
      for (const res of data.releasedReservations || []) {
        const projId = res.projectId || data.workOrderId || 'unknown-project';
        try {
          await this.prisma.projectCost.create({
            data: {
              tenantId: data.tenantId || 'default',
              projectId: projId,
              workOrderId: data.workOrderId,
              costType: 'MATERIAL',
              amount: res.quantity || 0,           // proxy for material cost (real system would use item cost rates)
              currency: 'PLN',
              reference: res.bomComponentId || res.reservationId || null,
            },
          });
        } catch (e) {
          this.logger.warn(`[Finance] Failed to create ProjectCost for reservation ${res.reservationId}: ${e.message}`);
        }
      }
      this.logger.log(`[Finance] Booked ${data.releasedReservations?.length || 0} MATERIAL ProjectCost entries for WO ${data.workOrderId}`);

      // === Faza 1 ETO: Update WipAccount (move released reservations into actual WIP)
      // This completes basic actual costing visibility for long ETO projects.
      for (const res of data.releasedReservations || []) {
        const projId = res.projectId || data.workOrderId || 'unknown-project';
        const amount = res.quantity || 0;
        try {
          await this.prisma.wipAccount.upsert({
            where: { projectId: projId },
            update: {
              wipBalance: { increment: amount },
              materialReserved: { decrement: amount }, // reduce the reserved bucket
            },
            create: {
              tenantId: data.tenantId || 'default',
              projectId: projId,
              wipBalance: amount,
              materialReserved: 0,
              laborCost: 0,
            },
          });
        } catch (e) {
          // If decrement would go negative, just set to 0 or ignore – non-fatal for POC
          this.logger.warn(`[Finance] WipAccount upsert issue for ${projId}: ${e.message}`);
        }
      }
    }
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
