import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerificationShortCode1760000021000 implements MigrationInterface {
  name = 'AddEmailVerificationShortCode1760000021000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`email_verification_tokens\`
      ADD COLUMN \`short_code\` VARCHAR(6) NULL AFTER \`token\`,
      ADD UNIQUE KEY \`uq_email_verification_short_code\` (\`short_code\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`email_verification_tokens\`
      DROP INDEX \`uq_email_verification_short_code\`,
      DROP COLUMN \`short_code\`
    `);
  }
}
