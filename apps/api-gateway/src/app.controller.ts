import { Controller, Post, Body, Get } from '@nestjs/common';

@Controller('api')
export class AppController {

  @Post('tax-legal')
  async handleTaxLegal(@Body() payload: any) {
    // High performance route simulating CQRS dispatch natively mapped
    return { success: true, message: 'TaxLegal processed natively', payload };
  }

  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
