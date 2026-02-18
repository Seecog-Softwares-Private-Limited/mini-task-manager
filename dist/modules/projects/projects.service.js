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
exports.ProjectsService = void 0;
const common_1 = require("@nestjs/common");
const projects_repository_1 = require("./repositories/projects.repository");
const project_members_repository_1 = require("./repositories/project-members.repository");
let ProjectsService = class ProjectsService {
    constructor(projectsRepository, projectMembersRepository) {
        this.projectsRepository = projectsRepository;
        this.projectMembersRepository = projectMembersRepository;
    }
    async findById(id) {
        return this.projectsRepository.findById(id);
    }
    async findByIdInOrganization(id, organizationId) {
        return this.projectsRepository.findByIdAndOrganization(id, organizationId);
    }
    async findByOrganization(organizationId) {
        return this.projectsRepository.findByOrganization(organizationId);
    }
    async create(organizationId, createdBy, dto) {
        return this.projectsRepository.create({
            organizationId,
            createdBy,
            name: dto.name,
            description: dto.description ?? null,
            visibility: dto.visibility ?? 'PRIVATE',
        });
    }
    async getProjectMembers(projectId) {
        return this.projectMembersRepository.findByProjectWithUser(projectId);
    }
    async addProjectMember(projectId, userId, role) {
        const existing = await this.projectMembersRepository.findByProjectAndUser(projectId, userId);
        if (existing) {
            throw new common_1.ConflictException('User is already a member of this project');
        }
        const member = await this.projectMembersRepository.create({ projectId, userId, role });
        const withUser = await this.projectMembersRepository.findById(member.id);
        return withUser ?? member;
    }
    async updateProjectMemberRole(memberId, role) {
        const member = await this.projectMembersRepository.findById(memberId);
        if (!member)
            throw new common_1.NotFoundException('Project member not found');
        await this.projectMembersRepository.updateRole(memberId, role);
        return { ...member, role };
    }
    async removeProjectMember(memberId) {
        const member = await this.projectMembersRepository.findById(memberId);
        if (!member)
            throw new common_1.NotFoundException('Project member not found');
        await this.projectMembersRepository.delete(memberId);
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [projects_repository_1.ProjectsRepository,
        project_members_repository_1.ProjectMembersRepository])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map