import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Jira-vertical prep, 6 of 7: per-seat pricing.
 * `plans.price_monthly` / `price_yearly` are a flat price for the whole
 * workspace today, with `max_users` as a hard cap rather than a multiplier.
 * Adds per-seat columns alongside the existing flat ones (old plans can stay
 * flat-priced; new tiers set the per-seat columns instead) and snapshots the
 * seat count onto each subscription at billing time, since
 * `organization_usage.users_count` changes continuously and an invoice must
 * not recompute differently after the fact.
 */
export class AddPlanPerSeatPricing1760000053000 implements MigrationInterface {
  name = 'AddPlanPerSeatPricing1760000053000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`plans\`
        ADD COLUMN \`price_per_seat_monthly\` DECIMAL(10,2) NULL AFTER \`price_yearly\`,
        ADD COLUMN \`price_per_seat_yearly\` DECIMAL(10,2) NULL AFTER \`price_per_seat_monthly\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`subscriptions\`
        ADD COLUMN \`seat_count\` INT NULL AFTER \`billing_cycle\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`subscriptions\` DROP COLUMN \`seat_count\``);
    await queryRunner.query(`
      ALTER TABLE \`plans\`
        DROP COLUMN \`price_per_seat_yearly\`,
        DROP COLUMN \`price_per_seat_monthly\`
    `);
  }
}
