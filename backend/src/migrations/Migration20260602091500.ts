import { Migration } from '@mikro-orm/migrations';

/**
 * Removes the HEAD role, collapsing the system to ADMIN / MANAGER / STAFF.
 *
 * HEAD's responsibilities move to MANAGER, under the new rule "at most one
 * MANAGER per department". Existing data is reconciled as:
 *   a. A HEAD in a department that already has a MANAGER is the surplus → STAFF.
 *   b. A HEAD in a department with no manager is promoted → MANAGER.
 *   c. Safety net for departments that already had multiple MANAGERs before
 *      this migration (the old schema had no single-manager constraint): keep
 *      the lowest-id manager, demote the rest → STAFF.
 *   d. The HEAD role row is deleted.
 *
 * Order (a) before (b) guarantees a real pre-existing MANAGER is never demoted
 * in favour of a converted HEAD.
 */
export class Migration20260602091500 extends Migration {
  override async up(): Promise<void> {
    // a. In departments that already have a MANAGER, demote the HEAD to STAFF.
    //    The derived table (mgr_depts) is required so MySQL can reference
    //    `staffs` within its own UPDATE subquery (avoids error 1093).
    this.addSql(
      `update \`staffs\` set \`role_id\` = (select \`id\` from \`roles\` where \`name\` = 'STAFF') ` +
        `where \`role_id\` = (select \`id\` from \`roles\` where \`name\` = 'HEAD') ` +
        `and \`department_id\` in (` +
        `select \`dept_id\` from (` +
        `select \`department_id\` as \`dept_id\` from \`staffs\` ` +
        `where \`role_id\` = (select \`id\` from \`roles\` where \`name\` = 'MANAGER') ` +
        `and \`department_id\` is not null` +
        `) as \`mgr_depts\`);`,
    );

    // b. Promote the remaining HEADs (departments without a manager) to MANAGER.
    this.addSql(
      `update \`staffs\` set \`role_id\` = (select \`id\` from \`roles\` where \`name\` = 'MANAGER') where \`role_id\` = (select \`id\` from \`roles\` where \`name\` = 'HEAD');`,
    );

    // c. Safety net: enforce one manager per department for any department that
    //    already had multiple managers. Keep the lowest-id manager, demote rest.
    this.addSql(
      `update \`staffs\` set \`role_id\` = (select \`id\` from \`roles\` where \`name\` = 'STAFF') ` +
        `where \`role_id\` = (select \`id\` from \`roles\` where \`name\` = 'MANAGER') ` +
        `and \`department_id\` is not null ` +
        `and \`id\` not in (` +
        `select \`keeper_id\` from (` +
        `select min(\`id\`) as \`keeper_id\` from \`staffs\` ` +
        `where \`role_id\` = (select \`id\` from \`roles\` where \`name\` = 'MANAGER') ` +
        `and \`department_id\` is not null group by \`department_id\`` +
        `) as \`keepers\`);`,
    );

    // d. Remove the HEAD role.
    this.addSql(`delete from \`roles\` where \`name\` = 'HEAD';`);
  }

  override async down(): Promise<void> {
    // IRREVERSIBLE DATA: the original HEAD/MANAGER staff assignments were merged
    // into MANAGER and cannot be restored. This only re-creates the role row so
    // the schema can roll back. Do NOT rely on down() to recover role history.
    this.addSql(
      `insert into \`roles\` (\`name\`) values ('HEAD') on duplicate key update \`name\` = \`name\`;`,
    );
  }
}
