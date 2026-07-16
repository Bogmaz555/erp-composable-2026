export interface TenantInfo {
  id: string;
  name: string;
  nip?: string;
  currency: string;
  isActive: boolean;
}

export class TenantService {
  private readonly tenants: TenantInfo[] = [
    { id: 'default', name: 'ERP Demo Sp. z o.o.', nip: '1234567890', currency: 'PLN', isActive: true },
    { id: 'tenant-pln', name: 'MAX Polska Produkcja', nip: '9876543210', currency: 'PLN', isActive: true },
    { id: 'tenant-de', name: 'MAX Germany GmbH', nip: 'DE123456789', currency: 'EUR', isActive: true },
    { id: 'tenant-demo', name: 'Sandbox Test Tenant', currency: 'PLN', isActive: false },
  ];

  list() {
    return { tenants: this.tenants, active: this.tenants.filter((t) => t.isActive) };
  }

  get(id: string) {
    return this.tenants.find((t) => t.id === id) ?? this.tenants[0];
  }
}
