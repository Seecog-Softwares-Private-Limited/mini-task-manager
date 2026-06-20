import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ApiKeyEntity } from './entities/api-key.entity';
import { ApiKeysRepository } from './api-keys.repository';
import { OrganizationsService } from '../organizations/organizations.service';
import { UsageService } from '../billing/usage.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

const KEY_PREFIX = 'mtm_';
const KEY_BYTES = 32;

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly apiKeysRepository: ApiKeysRepository,
    private readonly organizationsService: OrganizationsService,
    private readonly usageService: UsageService,
  ) {}

  async listByOrganization(organizationId: string, userId: string) {
    const canAccess = await this.organizationsService.canAccess(organizationId, userId);
    if (!canAccess) throw new ForbiddenException('You do not have access to this organization');
    return this.apiKeysRepository.findByOrganization(organizationId);
  }

  async create(organizationId: string, userId: string, name: string) {
    const canAccess = await this.organizationsService.canAccess(organizationId, userId);
    if (!canAccess) throw new ForbiddenException('You do not have access to this organization');

    const features = await this.usageService.getFeatureFlags(organizationId);
    if (!features.apiEnabled) {
      throw new ForbiddenException(
        'API access is not available on your plan. Upgrade to Pro or Enterprise to create API keys.',
      );
    }
    const rawKey = KEY_PREFIX + crypto.randomBytes(KEY_BYTES).toString('base64url');
    const keyHash = await bcrypt.hash(rawKey, 10);
    const keyPrefix = this.buildKeyPrefix(rawKey);
    const apiKey = await this.apiKeysRepository.create({
      organizationId,
      name: name.trim().slice(0, 100),
      keyHash,
      keyPrefix,
      createdBy: userId,
    });
    return {
      id: apiKey.id,
      organizationId: apiKey.organizationId,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      lastUsedAt: apiKey.lastUsedAt,
      createdAt: apiKey.createdAt,
      rawKey,
    };
  }

  private buildKeyPrefix(rawKey: string): string {
    return rawKey.slice(0, 6) + '••••••' + rawKey.slice(-3);
  }

  async authenticateRawKey(rawKey: string): Promise<ApiKeyEntity | null> {
    if (!rawKey.startsWith(KEY_PREFIX)) return null;
    const prefix = this.buildKeyPrefix(rawKey);
    const candidates = await this.apiKeysRepository.findByKeyPrefix(prefix);
    for (const candidate of candidates) {
      const match = await bcrypt.compare(rawKey, candidate.keyHash);
      if (match) {
        await this.apiKeysRepository.touchLastUsed(candidate.id);
        return candidate;
      }
    }
    return null;
  }

  async revoke(id: string, organizationId: string, userId: string) {
    const canAccess = await this.organizationsService.canAccess(organizationId, userId);
    if (!canAccess) throw new ForbiddenException('You do not have access to this organization');
    const key = await this.apiKeysRepository.findById(id);
    if (!key || key.organizationId !== organizationId) throw new NotFoundException('API key not found');
    await this.apiKeysRepository.delete(id);
  }
}
