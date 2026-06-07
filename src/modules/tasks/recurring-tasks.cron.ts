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
}

