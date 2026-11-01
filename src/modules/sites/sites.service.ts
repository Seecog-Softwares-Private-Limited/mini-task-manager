import { Injectable, NotFoundException } from '@nestjs/common';
import { SitesRepository } from './repositories/sites.repository';
import { SiteEntity } from './entities/site.entity';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class SitesService {
  constructor(
    private readonly sitesRepository: SitesRepository,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  async findByOrganization(organizationId: string): Promise<SiteEntity[]> {
    return this.sitesRepository.findByOrganization(organizationId);
  }

  async findByIdInOrganization(id: string, organizationId: string): Promise<SiteEntity | null> {
    return this.sitesRepository.findByIdAndOrganization(id, organizationId);
  }

  async countByOrganization(organizationId: string): Promise<number> {
    return this.sitesRepository.countByOrganization(organizationId);
  }

  async create(organizationId: string, createdBy: string, dto: CreateSiteDto): Promise<SiteEntity> {
    const site = await this.sitesRepository.create({
      organizationId,
      createdBy,
      name: dto.name,
      address: dto.address ?? null,
    });
    this.activityLogsService
      .log({ organizationId, userId: createdBy, entityType: 'site', entityId: site.id, action: 'create', metadata: { name: site.name } })
      .catch(() => {});
    return site;
  }

  async update(
    id: string,
    organizationId: string,
    dto: UpdateSiteDto,
    userId?: string,
  ): Promise<SiteEntity> {
    const site = await this.sitesRepository.findByIdAndOrganization(id, organizationId);
    if (!site) {
      throw new NotFoundException('Site not found');
    }
    const payload: Partial<SiteEntity> = {};
    if (dto.name !== undefined) payload.name = dto.name;
    if (dto.address !== undefined) payload.address = dto.address ?? null;
    if (dto.isArchived !== undefined) payload.isArchived = dto.isArchived;
    if (Object.keys(payload).length === 0) return site;
    await this.sitesRepository.update(id, payload);
    const updated = await this.sitesRepository.findByIdAndOrganization(id, organizationId);
    this.activityLogsService
      .log({ organizationId, userId: userId ?? undefined, entityType: 'site', entityId: id, action: 'update', metadata: { name: updated?.name ?? site.name } })
      .catch(() => {});
    return updated!;
  }

  /** Deletes a site; projects that belonged to it keep existing but lose the site link (FK ON DELETE SET NULL). */
  async deletePermanently(id: string, organizationId: string, userId?: string): Promise<void> {
    const site = await this.sitesRepository.findByIdAndOrganization(id, organizationId);
    if (!site) {
      throw new NotFoundException('Site not found');
    }
    await this.sitesRepository.delete(id);
    this.activityLogsService
      .log({ organizationId, userId: userId ?? undefined, entityType: 'site', entityId: id, action: 'delete', metadata: { name: site.name } })
      .catch(() => {});
  }
}
