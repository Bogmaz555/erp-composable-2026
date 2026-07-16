import { Controller, Get, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  private readonly auth = new AuthService();

  @Get('auth/roles')
  getRoles() {
    return this.auth.getRoles();
  }

  @Get('auth/context')
  getContext(@Headers() headers: Record<string, string | string[] | undefined>) {
    return this.auth.getContext(headers);
  }

  @Get('platform/auth/readiness')
  authReadiness() {
    return this.auth.getAuthReadiness();
  }
}
