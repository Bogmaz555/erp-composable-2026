import { Controller, Get, Headers, Query, UnauthorizedException } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { SearchServiceService } from './search-service.service';

@Controller()
export class SearchServiceController {
  constructor(private readonly searchService: SearchServiceService) {}

  /** Enterprise Q4 — HTTP search requires roles (gateway injects x-roles). */
  @Get('search')
  async search(
    @Query('q') q: string,
    @Headers('x-roles') rolesHeader?: string,
    @Headers('authorization') authorization?: string,
  ) {
    if (!authorization && process.env.AUTH_ENFORCE !== 'false') {
      throw new UnauthorizedException('search requires bearer (via gateway)');
    }
    const roles = (rolesHeader || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const query = (q || '').trim();
    if (query.length < 2) return { results: [], hint: 'min 2 chars' };
    return this.searchService.globalSearch(query, roles);
  }

  @Get('health')
  health() {
    return { status: 'ok', service: 'search-service', authz: true };
  }

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
