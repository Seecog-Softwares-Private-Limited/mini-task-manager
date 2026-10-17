import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecurringTasksService } from './recurring-tasks.service';
import { TasksService } from './tasks.service';

@Injectable()
export class RecurringTasksCron {
  private readonly logger = new Logger(RecurringTasksCron.name);

  constructor(
    private readonly recurringTasksService: RecurringTasksService,
    private readonly tasksService: TasksService,
  ) {}

  @Cron(CronExpression.EVERY_2_HOURS)
  async materializeDueOccurrences() {
    try {
      const result = await this.recurringTasksService.generateDueOccurrences();
      if (result.generated > 0) {
        this.logger.log(`Generated ${result.generated} recurring task occurrence(s)`);
      }
    } catch (error) {
      this.logger.error(
        `Recurring generation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** Run shortly after midnight to create the day's recurring task cards. */
  @Cron('5 0 * * *')
  async materializeAtMidnight() {
    try {
      const result = await this.recurringTasksService.generateDueOccurrences();
      this.logger.log(
        `Midnight recurring sync: generated ${result.generated} occurrence(s)`,
      );
    } catch (error) {
      this.logger.error(
        `Midnight recurring generation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** Every minute: notify checklist assignees before ritual / item due time. */
  @Cron(CronExpression.EVERY_MINUTE)
  async sendRitualDueReminders() {
    try {
      const [ritual, checklist] = await Promise.all([
        this.recurringTasksService.sendDueRitualReminders(),
        this.tasksService.sendDueChecklistItemReminders(),
      ]);
      const total = ritual.sent + checklist.sent;
      if (total > 0) {
        this.logger.log(
          `Sent ${total} due reminder(s) (ritual=${ritual.sent}, checklist=${checklist.sent})`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Ritual reminder cron failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
