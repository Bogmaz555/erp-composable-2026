import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class SearchServiceService implements OnModuleInit {
  private client: any;

  constructor() {
  }

  async onModuleInit() {
    const { Meilisearch } = await import('meilisearch');
    const meiliMasterKey = process.env.MEILI_MASTER_KEY || '';
    if (!meiliMasterKey) {
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

  async globalSearch(query: string) {
    // Search across multiple indices
    const results = await this.client.multiSearch({
      queries: [
        { indexUid: 'opportunities', q: query },
        { indexUid: 'projects', q: query }
      ]
    });
    return results.results;
  }
}
