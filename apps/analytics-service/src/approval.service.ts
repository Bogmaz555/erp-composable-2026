import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ApprovalRequest {
  id: string;
  tenantId: string;
  module: string;
  entityType: string;
  entityId: string;
  title: string;
  description?: string;
  requestedBy: string;
  requiredRole: string;
  status: ApprovalStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

@Injectable()
export class ApprovalService {
  private requests: ApprovalRequest[] = [];

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    if (this.requests.length > 0) return;
    const now = new Date().toISOString();
    this.requests = [
      {
        id: randomUUID(), tenantId: 'default', module: 'PROC', entityType: 'PurchaseOrder',
        entityId: 'po-demo-1', title: 'Zatwierdzenie PO — M-001 x 50 szt.',
        description: 'Zamówienie z MRP netting', requestedBy: 'system-mrp',
        requiredRole: 'PROCUREMENT', status: 'PENDING', createdAt: now,
      },
      {
        id: randomUUID(), tenantId: 'default', module: 'FIN', entityType: 'JournalEntry',
        entityId: 'je-demo-1', title: 'Księgowanie amortyzacji ST',
        requestedBy: 'finance-bot', requiredRole: 'ACCOUNTANT', status: 'PENDING', createdAt: now,
      },
    ];
  }

  create(input: Omit<ApprovalRequest, 'id' | 'createdAt' | 'status'>) {
    const req: ApprovalRequest = {
      ...input,
      id: randomUUID(),
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    this.requests.unshift(req);
    if (this.requests.length > 100) this.requests.pop();
    return req;
  }

  list(status?: ApprovalStatus, tenantId?: string) {
    let pool = tenantId
      ? this.requests.filter((r) => r.tenantId === tenantId || r.tenantId === 'default')
      : this.requests;
    const items = status ? pool.filter((r) => r.status === status) : pool;
    return {
      tenantId: tenantId ?? 'all',
      pending: pool.filter((r) => r.status === 'PENDING').length,
      items,
    };
  }

  resolve(id: string, action: 'APPROVED' | 'REJECTED', resolvedBy: string) {
    const idx = this.requests.findIndex((r) => r.id === id);
    if (idx < 0) throw new Error('Wniosek nie istnieje');
    this.requests[idx] = {
      ...this.requests[idx],
      status: action,
      resolvedAt: new Date().toISOString(),
      resolvedBy,
    };
    return this.requests[idx];
  }

  /** Auto-tworzenie wniosków z zdarzeń platformowych. */
  ingestFromEvent(subject: string, payload: unknown) {
    const p = payload as Record<string, string> | null;
    if (!/purchaseorder|po|approve|commitment/i.test(subject)) return;
    if (/approved/i.test(subject)) return;
    this.create({
      tenantId: 'default',
      module: 'PROC',
      entityType: 'PurchaseOrder',
      entityId: p?.orderId ?? p?.purchaseOrderId ?? randomUUID(),
      title: `Zatwierdzenie PO — ${p?.sku ?? 'materiał'}`,
      description: `Ilość: ${p?.quantity ?? '?'}`,
      requestedBy: p?.requestedBy ?? 'system',
      requiredRole: 'PROCUREMENT',
    });
  }
}
