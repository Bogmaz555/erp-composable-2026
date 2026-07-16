import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { MesController } from './mes.controller';
import { PlmController } from './plm.controller';
import { QualityController } from './quality.controller';
import { EamController } from './eam.controller';
import { FinController } from './fin.controller';
import { TaxLegalController } from './tax-legal.controller';
import { HrController } from './hr.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './auth/jwt.strategy';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [
    AppController,
    MesController,
    PlmController,
    QualityController,
    EamController,
    FinController,
    TaxLegalController,
    HrController,
  ],
  providers: [JwtStrategy, JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AppModule {}

// TD-001: Basic JWT/Keycloak foundation wired.
// Apply JwtAuthGuard globally or per controller for protected routes.
// Downstream services should receive validated claims via headers (x-user-id, x-roles, x-tenant-id).
// Full Keycloak + RBAC next. See SECURITY-ROADMAP.md.
