import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './auth/jwt.strategy';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PassportModule } from '@nestjs/passport';

/**
 * Pure-proxy gateway (PR 17 / KD-8): domain Nest controllers removed.
 * All /api/{crm,pm,inv,proc,mes,plm,quality,eam,fin,analytics,hr,tax-legal,ai,approvals,search}
 * traffic is registered in main.ts via @fastify/http-proxy + env *_SERVICE_URL.
 * Nest surface is health only; RBAC is enforced downstream on domain services.
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AppController],
  providers: [JwtStrategy, JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AppModule {}
