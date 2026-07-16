import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

// TD-001: Minimal downstream guard example
// In production: This would validate claims propagated from Gateway (x-user-id, x-roles).
// For now: Trusts the request.user set by middleware or previous layer.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Dev/test bypass: when Gateway enforcement is off, allow requests through.
    if (process.env.AUTH_ENFORCE !== 'true') return true;
    const request = context.switchToHttp().getRequest();
    // Basic check - in real system this would be more robust
    return !!request.user && request.user.id !== 'invalid-token';
  }
}
