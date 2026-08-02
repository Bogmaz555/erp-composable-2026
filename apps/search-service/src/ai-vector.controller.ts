import { Controller, Post, Body, HttpCode, HttpStatus, Get, Query } from '@nestjs/common';
import { SearchServiceService } from './search-service.service';

interface IngestPayload {
  sourceId: string;
  sourceType: string;
  content: string;
  metadata?: Record<string, any>;
}

interface QueryPayload {
  prompt: string;
  filters?: Record<string, any>;
}

@Controller('ai/vector')
export class AiVectorController {
  constructor(private readonly searchService: SearchServiceService) {}

  @Post('ingest')
  @HttpCode(HttpStatus.OK)
  async ingest(@Body() payload: IngestPayload) {
    // Symulacja wektoryzacji i zapisu do bazy wektorowej (RAG)
    // Docelowo: użycie embedding API (np. OpenAI, Vertex AI) i zapis wektorów 
    // do Meilisearch (v1.3+) lub pgvector.
    
    // Zapisujemy surowy tekst do Meilisearch (fallback full-text)
    await this.searchService.indexDocument('knowledge_base', {
      id: payload.sourceId,
      type: payload.sourceType,
      content: payload.content,
      ...payload.metadata,
      createdAt: new Date().toISOString()
    });

    console.log(`[RAG Ingest] Zapisano dokument ${payload.sourceId} (${payload.sourceType})`);
    
    return {
      status: 'success',
      message: 'Payload ingested successfully',
      sourceId: payload.sourceId
    };
  }

  @Post('query')
  @HttpCode(HttpStatus.OK)
  async query(@Body() payload: QueryPayload) {
    // Symulacja wyszukiwania semantycznego (Semantic Search)
    // Zwracamy sztuczny kontekst. W rzeczywistości użylibyśmy:
    // await this.searchService.vectorSearch('knowledge_base', payload.prompt)
    
    console.log(`[RAG Query] Otrzymano zapytanie wektorowe: "${payload.prompt}"`);

    const mockContext = [
      {
        id: 'DOC-9001',
        type: 'ISO_STANDARD',
        content: 'Zgodnie z normą 9001, wszystkie ramy nośne maszyn ETO muszą być spawane przez personel posiadający uprawnienia TIG (WELDING_TIG).',
        similarity: 0.94
      },
      {
        id: 'WO-99',
        type: 'ACTIVE_WORKORDER',
        content: 'Work Order #WO-99 (Projekt ETO 2d21d569) ma status PENDING i jest zablokowany z powodu braku zasobów ludzkich na zmianie nocnej.',
        similarity: 0.88
      }
    ];

    return {
      status: 'success',
      query: payload.prompt,
      results: mockContext
    };
  }
}
