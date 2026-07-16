import { Injectable, NestMiddleware } from '@nestjs/common';

export interface TenantRequest {
  headers: Record<string, string | string[] | undefined>;
  tenantId: string;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: TenantRequest, _res: unknown, next: () => void) {
    const raw = req.headers['x-tenant-id'];
    const id = (Array.isArray(raw) ? raw[0] : raw)?.trim();
    req.tenantId = id && id !== 'public' ? id : 'default';
    next();
  }
}
