import { Migration } from '@mikro-orm/migrations';

export class Migration20260508030100 extends Migration {
  private async hasColumn(tableName: string, columnName: string): Promise<boolean> {
    const result = (await this.execute(
      `
        SELECT COUNT(*) AS count
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?;
      `,
      [tableName, columnName],
    )) as Array<{ count: number }>;

    return Number(result[0]?.count ?? 0) > 0;
  }

  private async hasIndex(tableName: string, indexName: string): Promise<boolean> {
    const result = (await this.execute(
      `
        SELECT COUNT(*) AS count
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND INDEX_NAME = ?;
      `,
      [tableName, indexName],
    )) as Array<{ count: number }>;

    return Number(result[0]?.count ?? 0) > 0;
  }

  override async up(): Promise<void> {
    const smtpPassExists = await this.hasColumn('staffs', 'smtp_pass');
    if (!smtpPassExists) {
      await this.execute(`
        ALTER TABLE \`staffs\`
        ADD COLUMN \`smtp_pass\` VARCHAR(255) NULL AFTER \`email\`;
      `);
    }

    await this.execute(`
      UPDATE \`staffs\`
      SET \`smtp_pass\` = CONCAT('legacy-smtp-pass-', \`id\`)
      WHERE \`smtp_pass\` IS NULL OR TRIM(\`smtp_pass\`) = '';
    `);

    await this.execute(`
      ALTER TABLE \`staffs\`
      MODIFY \`smtp_pass\` VARCHAR(255) NOT NULL;
    `);

    const smtpPassUniqueIndexExists = await this.hasIndex(
      'staffs',
      'staffs_smtp_pass_unique',
    );
    if (!smtpPassUniqueIndexExists) {
      await this.execute(`
        CREATE UNIQUE INDEX \`staffs_smtp_pass_unique\`
        ON \`staffs\` (\`smtp_pass\`);
      `);
    }

    await this.execute(`
      ALTER TABLE \`staffs\`
      MODIFY \`leave_credit\` DECIMAL(6,2) NOT NULL DEFAULT 12.00;
    `);

    const leaveTypeExists = await this.hasColumn('leave_requests', 'type');
    if (!leaveTypeExists) {
      await this.execute(`
        ALTER TABLE \`leave_requests\`
        ADD COLUMN \`type\`
        ENUM('MORNING', 'AFTERNOON', 'FULL') NOT NULL DEFAULT 'FULL' AFTER \`leave_date\`;
      `);
    }

    await this.execute(`
      UPDATE \`leave_requests\`
      SET \`type\` = 'FULL'
      WHERE \`type\` IS NULL;
    `);

    await this.execute(`
      UPDATE \`leave_requests\`
      SET \`reason\` = 'Legacy request migrated without reason'
      WHERE \`reason\` IS NULL OR TRIM(\`reason\`) = '';
    `);

    await this.execute(`
      ALTER TABLE \`leave_requests\`
      MODIFY \`reason\` TEXT NOT NULL;
    `);
  }

  override async down(): Promise<void> {
    await this.execute(`
      ALTER TABLE \`leave_requests\`
      MODIFY \`reason\` TEXT NULL;
    `);

    const leaveTypeExists = await this.hasColumn('leave_requests', 'type');
    if (leaveTypeExists) {
      await this.execute(`
        ALTER TABLE \`leave_requests\`
        DROP COLUMN \`type\`;
      `);
    }

    await this.execute(`
      ALTER TABLE \`staffs\`
      MODIFY \`leave_credit\` INT NOT NULL DEFAULT 12;
    `);

    const smtpPassUniqueIndexExists = await this.hasIndex(
      'staffs',
      'staffs_smtp_pass_unique',
    );
    if (smtpPassUniqueIndexExists) {
      await this.execute(`
        DROP INDEX \`staffs_smtp_pass_unique\`
        ON \`staffs\`;
      `);
    }

    const smtpPassExists = await this.hasColumn('staffs', 'smtp_pass');
    if (smtpPassExists) {
      await this.execute(`
        ALTER TABLE \`staffs\`
        DROP COLUMN \`smtp_pass\`;
      `);
    }
  }
}
