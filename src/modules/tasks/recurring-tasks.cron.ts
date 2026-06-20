import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecurringTasksService } from './recurring-tasks.service';

@Injectable()
export class RecurringTasksCron {
  private readonly logger = new Logger(RecurringTasksCron.name);

  constructor(private readonly recurringTasksService: RecurringTasksService) {}

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
}

