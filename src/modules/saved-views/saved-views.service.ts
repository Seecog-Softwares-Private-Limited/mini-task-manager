import { ForbiddenException, Injectable } from '@nestjs/common';
import { SavedViewsRepository } from './saved-views.repository';
import { OrganizationsService } from '../organizations/organizations.service';
import { UsageService } from '../billing/usage.service';

@Injectable()
export class SavedViewsService {
  constructor(
    private readonly savedViewsRepository: SavedViewsRepository,
    private readonly organizationsService: OrganizationsService,
    private readonly usageService: UsageService,
  ) {}

  async list(organizationId: string, projectId: string, userId: string) {
    await this.assertAccess(organizationId, userId);
    const views = await this.savedViewsRepository.findForProject(organizationId, projectId, userId);
    return views.map((v) => ({
      id: v.id,
      name: v.name,
      filters: v.filtersJson,
      isShared: v.isShared,
      createdAt: v.createdAt,
      userId: v.userId,
    }));
  }

  async create(
    organizationId: string,
    projectId: string,
    userId: string,
    data: { name: string; filters: Record<string, unknown>; isShared?: boolean },
  ) {
    await this.assertAccess(organizationId, userId);
    const flags = await this.usageService.getFeatureFlags(organizationId);
    if (!flags.advancedReporting && data.isShared) {
      throw new ForbiddenException('Shared views require Business plan or higher.');
    }
    const view = await this.savedViewsRepository.create({
      organizationId,
      projectId,
      userId,
      name: data.name.trim().slice(0, 120),
      filtersJson: data.filters,
      isShared: Boolean(data.isShared),
    });
    return {
      id: view.id,
      name: view.name,
      filters: view.filtersJson,
      isShared: view.isShared,
      createdAt: view.createdAt,
    };
  }

  async remove(organizationId: string, userId: string, id: string) {
    await this.assertAccess(organizationId, userId);
    await this.savedViewsRepository.delete(id, organizationId, userId);
  }

  private async assertAccess(organizationId: string, userId: string) {
    const ok = await this.organizationsService.canAccess(organizationId, userId);
    if (!ok) throw new ForbiddenException('Access denied');
  }
}
