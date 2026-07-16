import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import * as fastify from 'fastify';

describe('Gateway Security: BOLA & Spoofing', () => {
  let app: NestFastifyApplication;
  let mockUpstream: fastify.FastifyInstance;
  let upstreamHeaders: Record<string, string | string[] | undefined> = {};

  beforeAll(async () => {
    // 1. Create a mock upstream server simulating the CRM microservice on an unused port (e.g. 4001, but we use an ephemeral one if possible. For exact matching with proxy, we'll use 40011)
    mockUpstream = fastify.fastify();
    mockUpstream.all('/*', (req, reply) => {
      upstreamHeaders = req.headers;
      reply.send({ success: true });
    });
    await mockUpstream.listen({ port: 40011, host: '127.0.0.1' });

    // 2. Boot the API Gateway
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    const fastifyInstance = app.getHttpAdapter().getInstance() as any;
    
    // The exact hook from main.ts
    fastifyInstance.addHook('onRequest', async (request: any, reply: any) => {
      delete request.headers['x-tenant-id'];
      delete request.headers['x-user-id'];
      delete request.headers['x-roles'];
    });

    const fastifyHttpProxy = require('@fastify/http-proxy');
    await app.register(fastifyHttpProxy as any, {
      upstream: 'http://127.0.0.1:40011',
      prefix: '/api/crm',
      replyOptions: {
        rewriteRequestHeaders: (originalReq: any, headers: any) => {
          return {
            ...headers,
            'x-tenant-id': originalReq.headers['x-tenant-id'] || 'public'
          };
        }
      }
    });

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
    await mockUpstream.close();
  });

  it('should drop spoofed x-tenant-id and x-user-id headers to prevent BOLA', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/crm/customers',
      headers: {
        'x-tenant-id': 'malicious-hacker-tenant',
        'x-user-id': 'hacker',
        'x-roles': 'ADMIN'
      }
    });

    expect(response.statusCode).toBe(200);
    
    // The upstream should NOT receive 'malicious-hacker-tenant'
    // It should receive the default 'public' because the gateway dropped it
    expect(upstreamHeaders['x-tenant-id']).toBe('public');
    expect(upstreamHeaders['x-user-id']).toBeUndefined();
    expect(upstreamHeaders['x-roles']).toBeUndefined();
  });
});
