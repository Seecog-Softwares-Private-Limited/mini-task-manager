import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { OrganizationsService } from '../organizations/organizations.service';

@Injectable()
export class ExportService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async exportOrganizationCsv(organizationId: string, userId: string): Promise<string> {
    const ok = await this.organizationsService.canAccess(organizationId, userId);
    if (!ok) throw new ForbiddenException('Access denied');

    const projects = await this.dataSource.query(
      `SELECT id, name, description, created_at FROM projects WHERE organization_id = ?`,
      [organizationId],
    );
    const tasks = await this.dataSource.query(
      `SELECT id, project_id, title, description, priority, due_date, status_id, assignee_id, created_at
       FROM tasks WHERE organization_id = ?`,
      [organizationId],
    );

    const lines: string[] = [];
    lines.push('# Projects');
    lines.push('id,name,description,created_at');
    for (const p of projects) {
      lines.push(
        [p.id, this.csvEscape(p.name), this.csvEscape(p.description ?? ''), p.created_at].join(','),
      );
    }
    lines.push('');
    lines.push('# Tasks');
    lines.push('id,project_id,title,priority,due_date,status_id,assignee_id,created_at');
    for (const t of tasks) {
      lines.push(
        [
          t.id,
          t.project_id,
          this.csvEscape(t.title),
          t.priority ?? '',
          t.due_date ?? '',
          t.status_id ?? '',
          t.assignee_id ?? '',
          t.created_at,
        ].join(','),
      );
    }
    return lines.join('\n');
  }

  private csvEscape(value: string): string {
    const s = String(value ?? '').replace(/"/g, '""');
    return `"${s}"`;
  }
}
