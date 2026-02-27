import { Injectable } from '@nestjs/common';
import { UsersRepository } from './repositories/users.repository';
import { UserEntity } from './entities/user.entity';
import { OrganizationsService } from '../organizations/organizations.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly organizationsService: OrganizationsService,
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
    if (!user?.passwordHash) return false;
    return bcrypt.compare(plainPassword, user.passwordHash);
  }

  async create(data: { email: string; fullName: string; password: string }): Promise<UserEntity> {
    const hash = await bcrypt.hash(data.password, 10);
    return this.usersRepository.create({
      email: data.email.toLowerCase(),
      fullName: data.fullName,
      passwordHash: hash,
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

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.usersRepository.update(userId, { passwordHash });
  }

  async linkGoogleId(userId: string, googleId: string): Promise<void> {
    await this.usersRepository.update(userId, { googleId, isEmailVerified: true } as Partial<UserEntity>);
  }
}
