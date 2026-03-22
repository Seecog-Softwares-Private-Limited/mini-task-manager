import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream } from 'fs';
import type { ReadStream } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { UsersRepository } from './repositories/users.repository';
import { UserEntity } from './entities/user.entity';
import { OrganizationsService } from '../organizations/organizations.service';
import { verifyPasswordAgainstStored } from './password-storage.util';
import { Configuration } from '../../config/configuration';

const AVATAR_MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export interface MulterFileLike {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname?: string;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly organizationsService: OrganizationsService,
    private readonly configService: ConfigService<Configuration>,
  ) {}

  async findById(id: string): Promise<UserEntity | null> {
    return this.usersRepository.findById(id);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findByEmail(email);
  }

  async findByGoogleId(googleId: string): Promise<UserEntity | null> {
    return this.usersRepository.findByGoogleId(googleId);
  }

  async findByPhone(phone: string): Promise<UserEntity | null> {
    return this.usersRepository.findByPhone(phone);
  }

  async findByIdForAuth(id: string): Promise<{ id: string; email: string } | null> {
    const user = await this.usersRepository.findById(id);
    if (!user) return null;
    return { id: user.id, email: user.email };
  }

  async validatePassword(userId: string, plainPassword: string): Promise<boolean> {
    const user = await this.usersRepository.findById(userId);
    return verifyPasswordAgainstStored(plainPassword, user?.passwordHash ?? null);
  }

  async create(data: { email: string; fullName: string; password: string }): Promise<UserEntity> {
    return this.usersRepository.create({
      email: data.email.toLowerCase(),
      fullName: data.fullName,
      passwordHash: data.password,
    });
  }

  async deleteById(id: string): Promise<void> {
    await this.usersRepository.deleteById(id);
  }

  /** Returns onboarding status for first-time setup flow. */
  async getOnboardingStatus(userId: string): Promise<{
    hasOrganizations: boolean;
    onboardingCompletedAt: string | null;
  }> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      return { hasOrganizations: false, onboardingCompletedAt: null };
    }
    const orgs = await this.organizationsService.findOrganizationsForUser(userId);
    const hasOrganizations = orgs.length > 0;
    const onboardingCompletedAt = user.onboardingCompletedAt
      ? (user.onboardingCompletedAt as Date).toISOString()
      : null;
    return { hasOrganizations, onboardingCompletedAt };
  }

  /** Marks onboarding as completed for the user. */
  async markOnboardingComplete(userId: string): Promise<void> {
    await this.usersRepository.update(userId, { onboardingCompletedAt: new Date() });
  }

  async updateEmailVerified(userId: string, verified: boolean): Promise<void> {
    await this.usersRepository.update(userId, { isEmailVerified: verified });
  }

  /** Stores password as plain text in `password_hash` (see password-storage.util). */
  async updatePassword(userId: string, plainPassword: string): Promise<void> {
    await this.usersRepository.update(userId, { passwordHash: plainPassword });
  }

  async linkGoogleId(userId: string, googleId: string): Promise<void> {
    await this.usersRepository.update(userId, { googleId, isEmailVerified: true } as Partial<UserEntity>);
  }

  /**
   * Public URL path (same-origin) stored in DB so <img> works without auth headers.
   */
  private avatarPublicPath(userId: string): string {
    return `/api/v1/users/avatar/${userId}`;
  }

  async uploadAvatar(userId: string, file: MulterFileLike): Promise<UserEntity> {
    const ext = AVATAR_MIME_EXT[file.mimetype];
    if (!ext) {
      throw new BadRequestException('Allowed image types: JPEG, PNG, WebP, GIF');
    }
    if (file.size > MAX_AVATAR_BYTES) {
      throw new BadRequestException('Image must be at most 2 MB');
    }
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const uploadsPath = this.configService.get('uploadsPath', { infer: true })!;
    const dir = path.join(uploadsPath, 'user-avatars', userId);
    await fs.mkdir(dir, { recursive: true });
    const existing = await fs.readdir(dir).catch(() => [] as string[]);
    for (const name of existing) {
      await fs.unlink(path.join(dir, name)).catch(() => {});
    }
    const fullPath = path.join(dir, `avatar${ext}`);
    await fs.writeFile(fullPath, file.buffer);

    const publicUrl = this.avatarPublicPath(userId);
    await this.usersRepository.update(userId, { avatarUrl: publicUrl });
    const updated = await this.usersRepository.findById(userId);
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  async clearAvatar(userId: string): Promise<void> {
    const uploadsPath = this.configService.get('uploadsPath', { infer: true })!;
    const dir = path.join(uploadsPath, 'user-avatars', userId);
    const existing = await fs.readdir(dir).catch(() => [] as string[]);
    for (const name of existing) {
      await fs.unlink(path.join(dir, name)).catch(() => {});
    }
    await fs.rm(dir, { recursive: true }).catch(() => {});
    await this.usersRepository.update(userId, { avatarUrl: null });
  }

  /**
   * Stream file for GET /users/avatar/:userId (public).
   */
  async getAvatarStream(
    userId: string,
  ): Promise<{ stream: ReadStream; contentType: string } | null> {
    const user = await this.usersRepository.findById(userId);
    if (!user?.avatarUrl) return null;

    const uploadsPath = this.configService.get('uploadsPath', { infer: true })!;
    const dir = path.join(uploadsPath, 'user-avatars', userId);
    const names = await fs.readdir(dir).catch(() => [] as string[]);
    const avatarFile = names.find((n) => n.startsWith('avatar'));
    if (!avatarFile) return null;

    const full = path.join(dir, avatarFile);
    const ext = path.extname(avatarFile).toLowerCase();
    const contentType =
      ext === '.png'
        ? 'image/png'
        : ext === '.jpg' || ext === '.jpeg'
          ? 'image/jpeg'
          : ext === '.webp'
            ? 'image/webp'
            : ext === '.gif'
              ? 'image/gif'
              : 'application/octet-stream';

    return { stream: createReadStream(full), contentType };
  }
}
