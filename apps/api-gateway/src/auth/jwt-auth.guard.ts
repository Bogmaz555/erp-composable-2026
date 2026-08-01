import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { isAuthDisabled } from './auth-env';
import { IS_PUBLIC_KEY } from './public.decorator';

// TD-001: JWT Auth Guard
// Protects Nest routes. Secure-by-default; only AUTH_DISABLE=true or AUTH_ENFORCE=false bypass.
// @Public() routes (gateway health) always skip.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector?: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (isAuthDisabled()) {
      console.warn(
        `SECURITY WARNING: JWT Auth bypassed (` +
          (process.env.AUTH_DISABLE === 'true'
            ? 'AUTH_DISABLE=true'
            : 'AUTH_ENFORCE=false') +
          `)`,
      );
      return true;
    }

    const isPublic =
      this.reflector?.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;
    if (isPublic) {
      return true;
    }

    // Defense-in-depth: path-based public (proxy hook + Nest health).
    const req = context.switchToHttp().getRequest<{ url?: string }>();
    const path = (req?.url || '').split('?')[0];
    if (path === '/api/health' || path.startsWith('/api/health/')) {
      return true;
    }

    return super.canActivate(context);
  }
}
