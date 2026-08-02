import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class SearchServiceService implements OnModuleInit {
  private client: any;

  constructor() {
  }

  async onModuleInit() {
    const { Meilisearch } = await import('meilisearch');
    const meiliMasterKey = (process.env.MEILI_MASTER_KEY || '').trim();
    const meiliRequired =
      process.env.MEILI_REQUIRED === 'true' ||
      process.env.NODE_ENV === 'production' ||
      process.env.AUTH_ENFORCE === 'true' ||
      process.env.PILOT === '1';
    if (!meiliMasterKey) {
      if (meiliRequired) {
        throw new Error(
          'MEILI_MASTER_KEY is required when NODE_ENV=production, AUTH_ENFORCE=true, PILOT=1, or MEILI_REQUIRED=true',
        );
      }
      console.warn(
        '[search-service] MEILI_MASTER_KEY is unset — connecting without apiKey (set env for pilot/prod)',
      );
    }
    this.client = new Meilisearch({
      host: process.env.MEILI_HOST || 'http://localhost:7700',
      ...(meiliMasterKey ? { apiKey: meiliMasterKey } : {}),
    });
    console.log('SearchServiceService initialized. Connecting to Meilisearch...');
    try {
      const health = await this.client.health();
      console.log('Meilisearch health:', health);
    } catch (e) {
      console.error('Failed to connect to Meilisearch', e);
    }
  }

  async indexDocument(indexName: string, document: any) {
    try {
      const index = this.client.index(indexName);
      await index.addDocuments([document]);
      console.log(`Indexed document in ${indexName}: ${document.id}`);
    } catch (e) {
      console.error(`Failed to index document in ${indexName}`, e);
    }
  }

  /**
   * Enterprise Q4 — global search with role-based index allowlist.
   * VIEWER/ENGINEER: projects + opportunities; ACCOUNTANT: no CRM ops; etc.
   */
  async globalSearch(query: string, roles: string[] = []) {
    if (!this.client) {
      return { results: [], error: 'meili_unavailable' };
    }
    const indices = this.allowedIndices(roles);
    try {
      const results = await this.client.multiSearch({
        queries: indices.map((indexUid) => ({ indexUid, q: query })),
      });
      return { results: results.results || [], indices, authz: true };
    } catch (e) {
      return {
        results: [],
        error: (e as Error).message,
        indices,
        authz: true,
      };
    }
  }

  /** Role → Meili index allowlist (deny by default). */
  allowedIndices(roles: string[]): string[] {
    const r = new Set((roles || []).map((x) => String(x).toUpperCase()));
    if (r.has('ADMIN')) return ['opportunities', 'projects', 'products', 'documents'];
    const out = new Set<string>(['projects']);
    if (r.has('ENGINEER') || r.has('PLANNER') || r.has('PRODUCTION_MANAGER')) {
      out.add('products');
      out.add('opportunities');
    }
    if (r.has('PROCUREMENT')) out.add('opportunities');
    if (r.has('ACCOUNTANT')) {
      /* finance docs only when indexed */
      out.add('documents');
    }
    if (r.size === 0) return []; // unauthenticated → empty
    return [...out];
  }
}
