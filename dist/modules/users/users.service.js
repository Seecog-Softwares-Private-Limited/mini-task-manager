"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs_1 = require("fs");
const fs = require("fs/promises");
const path = require("path");
const users_repository_1 = require("./repositories/users.repository");
const organizations_service_1 = require("../organizations/organizations.service");
const password_storage_util_1 = require("./password-storage.util");
const AVATAR_MIME_EXT = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
};
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
let UsersService = class UsersService {
    constructor(usersRepository, organizationsService, configService) {
        this.usersRepository = usersRepository;
        this.organizationsService = organizationsService;
        this.configService = configService;
    }
    async findById(id) {
        return this.usersRepository.findById(id);
    }
    async findByEmail(email) {
        return this.usersRepository.findByEmail(email);
    }
    async findByGoogleId(googleId) {
        return this.usersRepository.findByGoogleId(googleId);
    }
    async findByPhone(phone) {
        return this.usersRepository.findByPhone(phone);
    }
    async findByIdForAuth(id) {
        const user = await this.usersRepository.findById(id);
        if (!user)
            return null;
        return { id: user.id, email: user.email };
    }
    async validatePassword(userId, plainPassword) {
        const user = await this.usersRepository.findById(userId);
        return (0, password_storage_util_1.verifyPasswordAgainstStored)(plainPassword, user?.passwordHash ?? null);
    }
    async create(data) {
        return this.usersRepository.create({
            email: data.email.toLowerCase(),
            fullName: data.fullName,
            passwordHash: (0, password_storage_util_1.toStoredPassword)(data.password),
        });
    }
    async deleteById(id) {
        await this.usersRepository.deleteById(id);
    }
    async getOnboardingStatus(userId) {
        const user = await this.usersRepository.findById(userId);
        if (!user) {
            return { hasOrganizations: false, onboardingCompletedAt: null };
        }
        const orgs = await this.organizationsService.findOrganizationsForUser(userId);
        const hasOrganizations = orgs.length > 0;
        const onboardingCompletedAt = user.onboardingCompletedAt
            ? user.onboardingCompletedAt.toISOString()
            : null;
        return { hasOrganizations, onboardingCompletedAt };
    }
    async markOnboardingComplete(userId) {
        await this.usersRepository.update(userId, { onboardingCompletedAt: new Date() });
    }
    async updateEmailVerified(userId, verified) {
        await this.usersRepository.update(userId, { isEmailVerified: verified });
    }
    async updateFullName(userId, fullName) {
        await this.usersRepository.update(userId, { fullName });
    }
    async updatePassword(userId, plainPassword) {
        await this.usersRepository.update(userId, { passwordHash: (0, password_storage_util_1.toStoredPassword)(plainPassword) });
    }
    async linkGoogleId(userId, googleId) {
        await this.usersRepository.update(userId, { googleId, isEmailVerified: true });
    }
    avatarPublicPath(userId) {
        return `/api/v1/users/avatar/${userId}`;
    }
    async uploadAvatar(userId, file) {
        const ext = AVATAR_MIME_EXT[file.mimetype];
        if (!ext) {
            throw new common_1.BadRequestException('Allowed image types: JPEG, PNG, WebP, GIF');
        }
        if (file.size > MAX_AVATAR_BYTES) {
            throw new common_1.BadRequestException('Image must be at most 2 MB');
        }
        const user = await this.usersRepository.findById(userId);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const uploadsPath = this.configService.get('uploadsPath', { infer: true });
        const dir = path.join(uploadsPath, 'user-avatars', userId);
        await fs.mkdir(dir, { recursive: true });
        const existing = await fs.readdir(dir).catch(() => []);
        for (const name of existing) {
            await fs.unlink(path.join(dir, name)).catch(() => { });
        }
        const fullPath = path.join(dir, `avatar${ext}`);
        await fs.writeFile(fullPath, file.buffer);
        const publicUrl = this.avatarPublicPath(userId);
        await this.usersRepository.update(userId, { avatarUrl: publicUrl });
        const updated = await this.usersRepository.findById(userId);
        if (!updated)
            throw new common_1.NotFoundException('User not found');
        return updated;
    }
    async clearAvatar(userId) {
        const uploadsPath = this.configService.get('uploadsPath', { infer: true });
        const dir = path.join(uploadsPath, 'user-avatars', userId);
        const existing = await fs.readdir(dir).catch(() => []);
        for (const name of existing) {
            await fs.unlink(path.join(dir, name)).catch(() => { });
        }
        await fs.rm(dir, { recursive: true }).catch(() => { });
        await this.usersRepository.update(userId, { avatarUrl: null });
    }
    async getAvatarStream(userId) {
        const user = await this.usersRepository.findById(userId);
        if (!user?.avatarUrl)
            return null;
        const uploadsPath = this.configService.get('uploadsPath', { infer: true });
        const dir = path.join(uploadsPath, 'user-avatars', userId);
        const names = await fs.readdir(dir).catch(() => []);
        const avatarFile = names.find((n) => n.startsWith('avatar'));
        if (!avatarFile)
            return null;
        const full = path.join(dir, avatarFile);
        const ext = path.extname(avatarFile).toLowerCase();
        const contentType = ext === '.png'
            ? 'image/png'
            : ext === '.jpg' || ext === '.jpeg'
                ? 'image/jpeg'
                : ext === '.webp'
                    ? 'image/webp'
                    : ext === '.gif'
                        ? 'image/gif'
                        : 'application/octet-stream';
        return { stream: (0, fs_1.createReadStream)(full), contentType };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_repository_1.UsersRepository,
        organizations_service_1.OrganizationsService,
        config_1.ConfigService])
], UsersService);
//# sourceMappingURL=users.service.js.map