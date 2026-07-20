import { Module } from '@nestjs/common';
import { SearchServiceController } from './search-service.controller';
import { SearchServiceService } from './search-service.service';
import { AiVectorController } from './ai-vector.controller';

@Module({
  imports: [],
  controllers: [SearchServiceController, AiVectorController],
  providers: [SearchServiceService],
})
export class SearchServiceModule {}
