import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { isAuthDisabled } from './auth-env';

// TD-001: JWT Auth Guard
// Protects Nest routes. Secure-by-default; only AUTH_DISABLE=true or AUTH_ENFORCE=false bypass.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    if (isAuthDisabled()) {
      if (process.env.AUTH_DISABLE === 'true') {
        console.warn(
          'SECURITY WARNING: JWT Auth is globally disabled (AUTH_DISABLE=true)',
        );
      }
      return true;
    }
    return super.canActivate(context);
  }
}
