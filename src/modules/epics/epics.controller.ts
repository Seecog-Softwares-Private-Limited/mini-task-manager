import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { EpicsService } from './epics.service';
import { EpicEntity } from './entities/epic.entity';
import { EpicTaskStats } from './repositories/epics.repository';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { CreateEpicDto } from './dto/create-epic.dto';
import { UpdateEpicDto } from './dto/update-epic.dto';
import { EpicResponseDto } from './dto/epic-response.dto';

@Controller('epics')
@SkipThrottle({ auth: true })
@UseGuards(JwtAuthGuard, TenantGuard)
export class EpicsController {
  constructor(private readonly epicsService: EpicsService) {}

  @Get()
  async findAll(
    @TenantId() tenantId?: string,
    @Query('projectId') projectId?: string,
  ): Promise<EpicResponseDto[]> {
    const epics = await this.epicsService.findByOrganization(tenantId!, { projectId });
    return epics.map((e) => this.toResponse(e));
  }

  @Post()
  async create(
    @Body() dto: CreateEpicDto,
    @TenantId() tenantId?: string,
    @CurrentUserId() createdBy?: string,
  ): Promise<EpicResponseDto> {
    const epic = await this.epicsService.create(tenantId!, createdBy!, dto);
    const found = await this.epicsService.findByIdInOrganization(epic.id, tenantId!);
    return this.toResponse(found!);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @TenantId() tenantId?: string,
  ): Promise<EpicResponseDto | null> {
    const epic = await this.epicsService.findByIdInOrganization(id, tenantId!);
    if (!epic) return null;
    return this.toResponse(epic);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEpicDto,
    @TenantId() tenantId?: string,
    @CurrentUserId() userId?: string,
  ): Promise<EpicResponseDto> {
    await this.epicsService.update(id, tenantId!, dto, userId);
    const found = await this.epicsService.findByIdInOrganization(id, tenantId!);
    return this.toResponse(found!);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @TenantId() tenantId?: string,
    @CurrentUserId() userId?: string,
  ): Promise<{ success: boolean }> {
    await this.epicsService.delete(id, tenantId!, userId);
    return { success: true };
  }

  private toResponse(e: EpicEntity & Partial<EpicTaskStats>): EpicResponseDto {
    return {
      id: e.id,
      organizationId: e.organizationId,
      projectId: e.projectId,
      title: e.title,
      description: e.description ?? undefined,
      color: e.color ?? undefined,
      status: e.status,
      startDate: e.startDate ? e.startDate.toISOString().slice(0, 10) : undefined,
      dueDate: e.dueDate ? e.dueDate.toISOString().slice(0, 10) : undefined,
      createdBy: e.createdBy,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
      taskCount: e.taskCount ?? 0,
      completedTaskCount: e.completedTaskCount ?? 0,
    };
  }
}
