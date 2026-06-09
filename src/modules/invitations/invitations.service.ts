import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { InvitationsRepository } from './repositories/invitations.repository';
import { EmailService } from './email.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { UsersService } from '../users/users.service';
import { OrganizationMembersRepository } from '../organizations/repositories/organization-members.repository';
import { UserEntity } from '../users/entities/user.entity';
import { OrganizationInvitationEntity } from './entities/organization-invitation.entity';
import { generateUuid } from '../../common/utils/uuid.util';
import { buildInviteAcceptUrls } from '../../common/utils/frontend-url.util';
import { isLocalhostUrl } from './email-template.util';
import { PlanLimitService } from '../../plans/plan-limit.service';
import { NotificationsService } from '../notifications/notifications.service';

const INVITE_EXPIRY_DAYS = 7;

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

function expiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + INVITE_EXPIRY_DAYS);
  return d;
}

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private readonly invitationsRepo: InvitationsRepository,
    private readonly emailService: EmailService,
    private readonly orgsService: OrganizationsService,
    private readonly usersService: UsersService,
    private readonly orgMembersRepo: OrganizationMembersRepository,
    @Inject(forwardRef(() => PlanLimitService))
    private readonly planLimitService: PlanLimitService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createInvitation(
    organizationId: string,
    email: string,
    role: string,
    invitedByUserId: string,
  ): Promise<OrganizationInvitationEntity> {
    const normalizedEmail = email.toLowerCase().trim();

    const existingMember = await this.orgMembersRepo.findByOrganizationWithUser(organizationId);
    const alreadyMember = existingMember.find(
      (m) => m.user?.email?.toLowerCase() === normalizedEmail && m.status === 'ACTIVE',
    );
    if (alreadyMember) {
      throw new ConflictException('User is already a member of this organization');
    }

    const existingInvite = await this.invitationsRepo.findPendingByOrgAndEmail(
      organizationId,
      normalizedEmail,
    );
    if (existingInvite) {
      throw new ConflictException('A pending invitation already exists for this email');
    }

    await this.planLimitService.assertMemberLimit(organizationId);

    const existingUser = await this.usersService.findByEmail(normalizedEmail);

    const token = generateToken();
    const invitation = await this.invitationsRepo.create({
      organizationId,
      email: normalizedEmail,
      role,
      token,
      invitedBy: invitedByUserId,
      status: 'PENDING',
      expiresAt: expiresAt(),
    });

    const org = await this.orgsService.findById(organizationId);
    const inviter = await this.usersService.findById(invitedByUserId);

    const { acceptUrl, directAppUrl } = buildInviteAcceptUrls(token);

    this.logger.log(
      `Sending workspace invitation to ${normalizedEmail} for org ${organizationId} (acceptUrl=${acceptUrl}, direct=${directAppUrl})`,
    );
    if (isLocalhostUrl(directAppUrl)) {
      this.logger.warn(
        `Invitation link uses localhost — invitees cannot open it from Gmail and the Accept button is hidden. ` +
          `Set FRONTEND_URL_PRODUCTION=http://YOUR_SERVER:3000 and APP_MODE=production in properties.env, then pm2 restart all.`,
      );
    } else {
      this.logger.log(`Invitation accept URL is public: ${directAppUrl}`);
    }

    await this.emailService.sendInvitation({
      to: normalizedEmail,
      organizationName: org?.name ?? 'Unknown Organization',
      inviterName: inviter?.fullName ?? inviter?.email ?? 'A team member',
      role,
      acceptUrl,
      directAppUrl,
    });

    this.logger.log(`Workspace invitation email dispatched to ${normalizedEmail} (invitationId=${invitation.id})`);

    if (existingUser) {
      const orgName = org?.name ?? 'a workspace';
      const inviterLabel = inviter?.fullName ?? inviter?.email ?? 'A team member';
      await this.notificationsService.createNotification(
        existingUser.id,
        `Invitation to ${orgName}`,
        `${inviterLabel} invited you to join ${orgName} as ${role}. Open Workspaces to accept.`,
      );
    }

    return invitation;
  }

  async listPendingForUser(userId: string): Promise<OrganizationInvitationEntity[]> {
    const user = await this.usersService.findById(userId);
    if (!user?.email) return [];

    const invitations = await this.invitationsRepo.findPendingByEmail(user.email);
    const now = new Date();
    const active: OrganizationInvitationEntity[] = [];

    for (const invitation of invitations) {
      if (new Date(invitation.expiresAt) <= now) {
        await this.invitationsRepo.updateStatus(invitation.id, 'EXPIRED');
        continue;
      }
      active.push(invitation);
    }

    return active;
  }

  async acceptInvitationById(
    invitationId: string,
    userId: string,
  ): Promise<{ organizationId: string }> {
    const invitation = await this.invitationsRepo.findById(invitationId);
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    return this.acceptInvitation(invitation.token, userId);
  }

  async listByOrganization(organizationId: string): Promise<OrganizationInvitationEntity[]> {
    return this.invitationsRepo.findByOrganization(organizationId);
  }

  async validateToken(token: string): Promise<{
    valid: boolean;
    invitation?: OrganizationInvitationEntity;
    reason?: string;
  }> {
    const invitation = await this.invitationsRepo.findByToken(token);
    if (!invitation) {
      return { valid: false, reason: 'Invitation not found' };
    }
    if (invitation.status !== 'PENDING') {
      return { valid: false, reason: `Invitation has been ${invitation.status.toLowerCase()}` };
    }
    if (new Date() > invitation.expiresAt) {
      await this.invitationsRepo.updateStatus(invitation.id, 'EXPIRED');
      return { valid: false, reason: 'Invitation has expired' };
    }
    return { valid: true, invitation };
  }

  async validateTokenEnriched(token: string): Promise<{
    valid: boolean;
    reason?: string;
    organization?: { id: string; name: string };
    project?: { id: string; name: string } | null;
    role?: string;
    email?: string;
    expires_at?: string;
    status?: string;
    account_exists?: boolean;
  }> {
    const invitation = await this.invitationsRepo.findByToken(token);
    if (!invitation) {
      return { valid: false, reason: 'Invitation not found' };
    }
    if (invitation.status !== 'PENDING') {
      return {
        valid: false,
        reason: `Invitation has been ${invitation.status.toLowerCase()}`,
        organization: invitation.organization
          ? { id: invitation.organizationId, name: invitation.organization.name }
          : undefined,
        project: null,
        role: invitation.role,
        email: invitation.email,
        expires_at: invitation.expiresAt?.toISOString(),
        status: invitation.status,
      };
    }
    if (new Date() > invitation.expiresAt) {
      await this.invitationsRepo.updateStatus(invitation.id, 'EXPIRED');
      return {
        valid: false,
        reason: 'Invitation has expired',
        organization: invitation.organization
          ? { id: invitation.organizationId, name: invitation.organization.name }
          : undefined,
        project: null,
        role: invitation.role,
        email: invitation.email,
        expires_at: invitation.expiresAt?.toISOString(),
        status: 'EXPIRED',
        account_exists: await this.emailHasExistingAccount(invitation.email),
      };
    }

    const accountExists = await this.emailHasExistingAccount(invitation.email);

    return {
      valid: true,
      organization: invitation.organization
        ? { id: invitation.organizationId, name: invitation.organization.name }
        : undefined,
      project: null,
      role: invitation.role,
      email: invitation.email,
      expires_at: invitation.expiresAt?.toISOString(),
      status: invitation.status,
      account_exists: accountExists,
    };
  }

  private async emailHasExistingAccount(email: string): Promise<boolean> {
    const user = await this.usersService.findByEmail(email);
    return !!user;
  }

  async acceptInvitation(
    token: string,
    userIdOrUser: string | UserEntity,
  ): Promise<{ organizationId: string }> {
    const { valid, invitation, reason } = await this.validateToken(token);
    if (!valid || !invitation) {
      throw new BadRequestException(reason ?? 'Invalid invitation');
    }

    const user =
      typeof userIdOrUser === 'string'
        ? await this.usersService.findById(userIdOrUser)
        : userIdOrUser;
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenException('This invitation was sent to a different email address');
    }

    const existing = await this.orgMembersRepo.findByOrganizationAndUser(
      invitation.organizationId,
      user.id,
    );
    if (existing) {
      await this.invitationsRepo.updateStatus(invitation.id, 'ACCEPTED');
      return { organizationId: invitation.organizationId };
    }

    await this.orgMembersRepo.create({
      id: generateUuid(),
      organizationId: invitation.organizationId,
      userId: user.id,
      role: invitation.role,
      status: 'ACTIVE',
    });
    await this.invitationsRepo.updateStatus(invitation.id, 'ACCEPTED');

    return { organizationId: invitation.organizationId };
  }

  async cancelInvitation(invitationId: string, organizationId: string): Promise<void> {
    const invitation = await this.invitationsRepo.findById(invitationId);
    if (!invitation || invitation.organizationId !== organizationId) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('Only pending invitations can be cancelled');
    }
    await this.invitationsRepo.updateStatus(invitationId, 'CANCELLED');

    const invitedUser = await this.usersService.findByEmail(invitation.email);
    if (invitedUser) {
      const memberships = await this.orgMembersRepo.findByUser(invitedUser.id);
      if (memberships.length === 0) {
        try {
          await this.usersService.deleteById(invitedUser.id);
        } catch {
          // User may have other references; invite is still cancelled
        }
      }
    }
  }

  async resendInvitation(invitationId: string, organizationId: string): Promise<OrganizationInvitationEntity> {
    const invitation = await this.invitationsRepo.findById(invitationId);
    if (!invitation || invitation.organizationId !== organizationId) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.status !== 'PENDING' && invitation.status !== 'EXPIRED') {
      throw new BadRequestException('Cannot resend this invitation');
    }

    const newToken = generateToken();
    await this.invitationsRepo.updateTokenAndExpiry(invitationId, newToken, expiresAt());

    const org = await this.orgsService.findById(organizationId);
    const inviter = await this.usersService.findById(invitation.invitedBy);

    const { acceptUrl, directAppUrl } = buildInviteAcceptUrls(newToken);

    this.logger.log(`Resending workspace invitation to ${invitation.email} (acceptUrl=${acceptUrl})`);
    if (isLocalhostUrl(directAppUrl)) {
      this.logger.warn(
        `Invitation resend uses localhost — set APP_MODE=production and FRONTEND_URL_PRODUCTION, then restart the API.`,
      );
    }

    await this.emailService.sendInvitation({
      to: invitation.email,
      organizationName: org?.name ?? 'Unknown Organization',
      inviterName: inviter?.fullName ?? inviter?.email ?? 'A team member',
      role: invitation.role,
      acceptUrl,
      directAppUrl,
    });

    this.logger.log(`Workspace invitation resent to ${invitation.email}`);

    return (await this.invitationsRepo.findById(invitationId))!;
  }
}
