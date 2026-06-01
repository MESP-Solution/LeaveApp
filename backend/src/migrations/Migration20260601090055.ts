import { Migration } from '@mikro-orm/migrations';

export class Migration20260601090055 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table \`departments\` (\`id\` int unsigned not null auto_increment primary key, \`name\` varchar(64) not null, \`description\` text null, \`created_at\` datetime(3) not null default current_timestamp(3), \`updated_at\` datetime(3) not null default current_timestamp(3) on update current_timestamp(3)) default character set utf8mb4 collate utf8mb4_unicode_ci engine = InnoDB;`);
    this.addSql(`alter table \`departments\` add unique \`departments_name_unique\`(\`name\`);`);

    // Seed example departments so staff can be assigned right after migrating.
    this.addSql(`insert ignore into \`departments\` (\`name\`) values ('IT'), ('HR'), ('ACCOUNTING'), ('SALES');`);

    this.addSql(`alter table \`staffs\` add \`department_id\` int unsigned not null;`);
    this.addSql(`alter table \`staffs\` modify \`leave_credit\` numeric(6,2) not null default 12;`);
    this.addSql(`alter table \`staffs\` add constraint \`staffs_department_id_foreign\` foreign key (\`department_id\`) references \`departments\` (\`id\`) on update cascade;`);
    this.addSql(`alter table \`staffs\` add index \`staffs_department_id_index\`(\`department_id\`);`);

    this.addSql(`alter table \`leave_requests\` modify \`type\` enum('MORNING', 'AFTERNOON', 'FULL') not null default 'FULL';`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table \`staffs\` drop foreign key \`staffs_department_id_foreign\`;`);

    this.addSql(`drop table if exists \`departments\`;`);

    this.addSql(`alter table \`leave_requests\` modify \`type\` enum('MORNING', 'AFTERNOON', 'FULL') not null default 'FULL';`);

    this.addSql(`alter table \`staffs\` drop index \`staffs_department_id_index\`;`);
    this.addSql(`alter table \`staffs\` drop column \`department_id\`;`);

    this.addSql(`alter table \`staffs\` modify \`leave_credit\` decimal(6,2) not null default 12.00;`);
  }

}
