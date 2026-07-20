import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { SearchServiceService } from './search-service.service';

@Controller()
export class SearchServiceController {
  constructor(private readonly searchService: SearchServiceService) {}

  @EventPattern('crm.opportunity.won.v1')
  async handleOpportunityWon(@Payload() data: any) {
    await this.searchService.indexDocument('opportunities', {
      id: data.opportunityId,
      title: `Projekt ETO: ${data.opportunityId}`,
      status: 'WON',
      type: 'OPPORTUNITY',
      createdAt: new Date().toISOString()
    });
  }

  @EventPattern('pm.project.created.v1')
  async handleProjectCreated(@Payload() data: any) {
    await this.searchService.indexDocument('projects', {
      id: data.projectId,
      title: data.name || `Projekt PM: ${data.projectId}`,
      type: 'PROJECT',
      wbsCount: data.wbsElements?.length || 0,
      createdAt: new Date().toISOString()
    });
  }
}
