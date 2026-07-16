import { Module } from '@nestjs/common';
import { TaxLegalController } from './tax-legal.controller';
import { PrismaService } from './prisma.service';
import { KsefSandboxService } from './ksef-sandbox.service';
import { KsefProductionService } from './ksef-production.service';
import { KsefRouterService } from './ksef-router.service';
import { JpkV7Service } from './jpk-v7.service';
import { JpkKrService } from './jpk-kr.service';
import { JpkKrValidatorService } from './jpk-kr-validator.service';

@Module({
  controllers: [TaxLegalController],
  providers: [PrismaService, KsefSandboxService, KsefProductionService, KsefRouterService, JpkV7Service, JpkKrService, JpkKrValidatorService],
})
export class TaxLegalModule {}
