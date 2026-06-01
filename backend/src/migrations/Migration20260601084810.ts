import { Migration } from '@mikro-orm/migrations';

export class Migration20260601084810 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table \`staffs\` modify \`leave_credit\` numeric(6,2) not null default 12;`);

    this.addSql(`alter table \`leave_requests\` drop index \`leave_requests_status_index\`;`);

    this.addSql(`alter table \`leave_requests\` modify \`type\` enum('MORNING', 'AFTERNOON', 'FULL') not null default 'FULL';`);
    this.addSql(`alter table \`leave_requests\` rename index \`leave_requests_resolved_by_foreign\` to \`leave_requests_resolved_by_index\`;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table \`leave_requests\` modify \`type\` enum('MORNING', 'AFTERNOON', 'FULL') not null default 'FULL';`);
    this.addSql(`alter table \`leave_requests\` add index \`leave_requests_status_index\`(\`status\`);`);
    this.addSql(`alter table \`leave_requests\` rename index \`leave_requests_resolved_by_index\` to \`leave_requests_resolved_by_foreign\`;`);

    this.addSql(`alter table \`staffs\` modify \`leave_credit\` decimal(6,2) not null default 12.00;`);
  }

}
