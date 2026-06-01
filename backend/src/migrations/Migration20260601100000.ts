import { Migration } from '@mikro-orm/migrations';

export class Migration20260601100000 extends Migration {
  override async up(): Promise<void> {
    // ADMIN does not belong to a department, so department_id becomes optional.
    this.addSql(
      `alter table \`staffs\` modify \`department_id\` int unsigned null;`,
    );

    // Detach existing ADMIN accounts from any department to match the new rule.
    this.addSql(
      `update \`staffs\` set \`department_id\` = null where \`role_id\` in (select \`id\` from \`roles\` where \`name\` = 'ADMIN');`,
    );
  }

  override async down(): Promise<void> {
    // Re-attach any null department (e.g. ADMIN rows) to the first department
    // so the NOT NULL constraint can be restored without corrupting data.
    this.addSql(
      `update \`staffs\` set \`department_id\` = (select min(\`id\`) from \`departments\`) where \`department_id\` is null;`,
    );
    this.addSql(
      `alter table \`staffs\` modify \`department_id\` int unsigned not null;`,
    );
  }
}
