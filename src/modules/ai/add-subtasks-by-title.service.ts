import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TasksRepository } from '../tasks/repositories/tasks.repository';
import { TasksService } from '../tasks/tasks.service';
import { PatchTaskDto } from '../tasks/dto/patch-task.dto';
import { AddSubtasksByTitleRequestDto } from './dto/add-subtasks-by-title-request.dto';
import { AddSubtasksByTitleResponseDto } from './dto/add-subtasks-by-title-response.dto';

@Injectable()
export class AddSubtasksByTitleService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly tasksService: TasksService,
  ) {}

  async addByTitle(
    organizationId: string,
    userId: string,
    dto: AddSubtasksByTitleRequestDto,
  ): Promise<AddSubtasksByTitleResponseDto> {
    const title = dto.title.trim();
    const matches = await this.tasksRepository.findByTitleInOrganization(
      title,
      organizationId,
      dto.projectId,
    );

    if (matches.length === 0) {
      throw new NotFoundException(`No task found with title "${title}"`);
    }
    if (matches.length > 1) {
      throw new ConflictException({
        message: `${matches.length} tasks share that title. Retry with projectId to pick one.`,
        candidates: matches.map((t) => ({ taskId: t.id, projectId: t.projectId })),
      });
    }

    const task = matches[0];
    const existingTitles = new Set(
      (task.subtasks ?? []).map((s) => String(s.title ?? '').trim().toLowerCase()),
    );
    const skippedTitles: string[] = [];
    const newSubtasks: NonNullable<PatchTaskDto['subtasks']> = [];
    for (const item of dto.subtasks) {
      const itemTitle = item.title.trim();
      const key = itemTitle.toLowerCase();
      if (existingTitles.has(key)) {
        skippedTitles.push(itemTitle);
        continue;
      }
      existingTitles.add(key);
      newSubtasks.push({ title: itemTitle, description: item.description });
    }

    const existingSubtasks = (task.subtasks ?? []) as unknown as NonNullable<PatchTaskDto['subtasks']>;
    const updated = await this.tasksService.update(
      task.id,
      organizationId,
      { subtasks: [...existingSubtasks, ...newSubtasks] },
      userId,
    );
    if (!updated) {
      throw new NotFoundException('Task not found');
    }

    return {
      taskId: updated.id,
      projectId: updated.projectId,
      title: updated.title,
      addedCount: newSubtasks.length,
      skippedTitles,
      totalSubtasks: updated.subtasks?.length ?? 0,
    };
  }
}
