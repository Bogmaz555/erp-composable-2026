import { Controller, Get, Post, Body, Headers } from '@nestjs/common';
import { FixedAssetsService } from './fixed-assets.service';

@Controller('fin')
export class FixedAssetsController {
  constructor(private readonly assets: FixedAssetsService) {}

  private tenant(headers: Record<string, string | string[] | undefined>) {
    const raw = headers['x-tenant-id'];
    const id = Array.isArray(raw) ? raw[0] : raw;
    return id && id !== 'public' ? id : 'default';
  }

  @Get('fixed-assets')
  list(@Headers() headers: Record<string, string | string[] | undefined>) {
    return this.assets.list(this.tenant(headers));
  }

  @Post('fixed-assets')
  create(@Body() body: {
    code: string; name: string; category?: string;
    acquisitionCost: number; salvageValue?: number; usefulLifeMonths?: number;
  }) {
    return this.assets.create(body);
  }

  @Post('fixed-assets/depreciate')
  depreciate(@Body() body?: { period?: string }) {
    return this.assets.runDepreciation(body?.period);
  }
}
