import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

// TD-001: Minimal downstream guard for PM (consistent pattern with MES and INV)
// Trusts claims propagated from Gateway.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Dev/test bypass: when Gateway enforcement is off, allow requests through.
    if (process.env.AUTH_ENFORCE !== 'true') return true;
    const request = context.switchToHttp().getRequest();
    return !!request.user && request.user.id !== 'invalid-token';
  }
}
