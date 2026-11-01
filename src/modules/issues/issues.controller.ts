import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { IssuesService } from './issues.service';
import { IssueEntity } from './entities/issue.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { IssueResponseDto } from './dto/issue-response.dto';

@Controller('issues')
@SkipThrottle({ auth: true })
@UseGuards(JwtAuthGuard, TenantGuard)
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Get()
  async findAll(
    @TenantId() tenantId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
  ): Promise<IssueResponseDto[]> {
    const issues = await this.issuesService.findByOrganization(tenantId!, { projectId, status });
    return issues.map((i) => this.toResponse(i));
  }

  @Post()
  async create(
    @Body() dto: CreateIssueDto,
    @TenantId() tenantId?: string,
    @CurrentUserId() raisedBy?: string,
  ): Promise<IssueResponseDto> {
    const issue = await this.issuesService.create(tenantId!, raisedBy!, dto);
    return this.toResponse(issue);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @TenantId() tenantId?: string,
  ): Promise<IssueResponseDto | null> {
    const issue = await this.issuesService.findByIdInOrganization(id, tenantId!);
    if (!issue) return null;
    return this.toResponse(issue);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateIssueDto,
    @TenantId() tenantId?: string,
    @CurrentUserId() userId?: string,
  ): Promise<IssueResponseDto> {
    const issue = await this.issuesService.update(id, tenantId!, dto, userId);
    return this.toResponse(issue);
  }

  private toResponse(i: IssueEntity): IssueResponseDto {
    return {
      id: i.id,
      organizationId: i.organizationId,
      projectId: i.projectId,
      siteId: i.siteId ?? undefined,
      taskId: i.taskId ?? undefined,
      subtaskId: i.subtaskId ?? undefined,
      title: i.title,
      description: i.description ?? undefined,
      severity: i.severity,
      status: i.status,
      source: i.source,
      raisedBy: i.raisedBy ?? undefined,
      assigneeId: i.assigneeId ?? undefined,
      resolvedAt: i.resolvedAt ? i.resolvedAt.toISOString() : undefined,
      resolvedBy: i.resolvedBy ?? undefined,
      resolutionNote: i.resolutionNote ?? undefined,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    };
  }
}
