import { Migration } from '@mikro-orm/migrations';

/**
 * Adds the `password_reset_otps` table backing the public "forgot password"
 * OTP flow. Stores only a bcrypt hash of the code; rows are queried by email
 * + expiry, hence the composite index.
 */
export class Migration20260602150000 extends Migration {
  override async up(): Promise<void> {
    await Promise.resolve();

    this.addSql(`
      CREATE TABLE \`password_reset_otps\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`email\` VARCHAR(255) NOT NULL,
        \`otp_hash\` VARCHAR(255) NOT NULL,
        \`expires_at\` DATETIME(3) NOT NULL,
        \`consumed_at\` DATETIME(3) NULL,
        \`attempts\` INT NOT NULL DEFAULT 0,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        KEY \`password_reset_otps_email_expires_at_index\` (\`email\`, \`expires_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  override async down(): Promise<void> {
    await Promise.resolve();

    this.addSql(`DROP TABLE IF EXISTS \`password_reset_otps\`;`);
  }
}
