import { Controller, Get } from '@nestjs/common';

@Controller('otel')
export class OtelController {
  @Get('status')
  status() {
    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';
    const serviceName = process.env.OTEL_SERVICE_NAME || 'analytics-service';
    return {
      enabled: process.env.OTEL_ENABLED !== 'false',
      exporterEndpoint: endpoint,
      serviceName,
      jaegerUi: process.env.JAEGER_UI_URL || 'http://localhost:16686',
      profile: 'docker compose --profile otel up -d jaeger',
    };
  }
}
