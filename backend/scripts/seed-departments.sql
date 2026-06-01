-- Seed the IT and Marketing departments.
-- Idempotent: `departments.name` is UNIQUE, so re-running updates description only.
-- Non-destructive: existing departments (HR, ACCOUNTING, SALES, ...) are left untouched.
--
-- Usage:
--   mysql -u <user> -p <db_name> < scripts/seed-departments.sql

START TRANSACTION;

INSERT INTO `departments` (`name`, `description`)
VALUES
  ('IT', 'Information Technology'),
  ('Marketing', 'Marketing & Communications')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

COMMIT;
