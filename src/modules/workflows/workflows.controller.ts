import { Controller, Get, Post, Body, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { WorkflowsService } from './workflows.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { WorkflowResponseDto } from './dto/workflow-response.dto';
import { WorkflowStatusResponseDto } from './dto/workflow-status-response.dto';

@Controller('workflows')
@SkipThrottle({ auth: true })
@UseGuards(JwtAuthGuard, TenantGuard)
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post()
  async create(@Body() dto: CreateWorkflowDto): Promise<WorkflowResponseDto> {
    const projectId = dto.projectId!;
    const workflow = await this.workflowsService.create(projectId, dto);
    return { id: workflow.id, projectId: workflow.projectId, name: workflow.name, isDefault: workflow.isDefault };
  }

  @Get('project/:projectId')
  async findByProject(
    @Param('projectId') projectId: string,
    @TenantId() tenantId: string,
  ): Promise<WorkflowResponseDto[]> {
    const list = await this.workflowsService.findByProject(projectId, tenantId);
    return list.map((w) => ({ id: w.id, projectId: w.projectId, name: w.name, isDefault: w.isDefault }));
  }

  @Get(':id/statuses')
  async getStatuses(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<WorkflowStatusResponseDto[]> {
    const workflow = await this.workflowsService.findByIdInOrganization(id, tenantId);
    if (!workflow) return [];
    const statuses = await this.workflowsService.getStatuses(id);
    return statuses.map((s) => ({
      id: s.id,
      workflowId: s.workflowId,
      name: s.name,
      position: s.position,
      color: s.color ?? undefined,
      type: s.type,
    }));
  }

  @Post('project/:projectId/default')
  async createDefault(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @TenantId() tenantId: string,
  ): Promise<WorkflowResponseDto> {
    const workflow = await this.workflowsService.createDefaultWorkflow(projectId, tenantId);
    return { id: workflow.id, projectId: workflow.projectId, name: workflow.name, isDefault: workflow.isDefault };
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @TenantId() tenantId?: string,
  ): Promise<WorkflowResponseDto | null> {
    const workflow = await this.workflowsService.findByIdInOrganization(id, tenantId!);
    if (!workflow) return null;
    return { id: workflow.id, projectId: workflow.projectId, name: workflow.name, isDefault: workflow.isDefault };
  }
}
