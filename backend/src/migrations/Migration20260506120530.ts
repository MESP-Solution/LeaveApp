import { Migration } from '@mikro-orm/migrations';

export class Migration20260506120530 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE \`roles\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(64) NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`roles_name_unique\` (\`name\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    this.addSql(`
      CREATE TABLE \`staffs\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`full_name\` VARCHAR(255) NOT NULL,
        \`email\` VARCHAR(255) NOT NULL,
        \`password_hash\` VARCHAR(255) NOT NULL,
        \`role_id\` INT UNSIGNED NOT NULL,
        \`leave_credit\` INT NOT NULL DEFAULT 12,
        \`created_by\` INT UNSIGNED NULL,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`staffs_email_unique\` (\`email\`),
        KEY \`staffs_role_id_index\` (\`role_id\`),
        KEY \`staffs_created_by_index\` (\`created_by\`),
        CONSTRAINT \`staffs_role_id_foreign\` FOREIGN KEY (\`role_id\`) REFERENCES \`roles\` (\`id\`) ON UPDATE CASCADE,
        CONSTRAINT \`staffs_created_by_foreign\` FOREIGN KEY (\`created_by\`) REFERENCES \`staffs\` (\`id\`) ON UPDATE CASCADE ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    this.addSql(`
      CREATE TABLE \`leave_requests\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`staff_id\` INT UNSIGNED NOT NULL,
        \`leave_date\` DATE NOT NULL,
        \`reason\` TEXT NULL,
        \`status\` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
        \`resolved_by\` INT UNSIGNED NULL,
        \`reject_reason\` TEXT NULL,
        \`resolved_at\` DATETIME(3) NULL,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        KEY \`leave_requests_staff_id_index\` (\`staff_id\`),
        KEY \`leave_requests_status_index\` (\`status\`),
        CONSTRAINT \`leave_requests_staff_id_foreign\` FOREIGN KEY (\`staff_id\`) REFERENCES \`staffs\` (\`id\`) ON UPDATE CASCADE,
        CONSTRAINT \`leave_requests_resolved_by_foreign\` FOREIGN KEY (\`resolved_by\`) REFERENCES \`staffs\` (\`id\`) ON UPDATE CASCADE ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS \`leave_requests\`;`);
    this.addSql(`DROP TABLE IF EXISTS \`staffs\`;`);
    this.addSql(`DROP TABLE IF EXISTS \`roles\`;`);
  }
}
