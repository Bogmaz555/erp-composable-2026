import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

// TD-001: Minimal downstream guard for PLM (consistent with MES/INV/PM pattern)
// Trusts claims from Gateway. Critical for protecting BOM release and ECO operations.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Dev/test bypass: when Gateway enforcement is off, allow requests through.
    if (process.env.AUTH_ENFORCE !== 'true') return true;
    const request = context.switchToHttp().getRequest();
    return !!request.user && request.user.id !== 'invalid-token';
  }
}
