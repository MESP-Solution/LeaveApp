-- Seed the four roles and a single ADMIN account.
-- Idempotent: safe to run multiple times (ON DUPLICATE KEY).
-- Admin login -> email: admin@leaveapp.local | password: 12345678
--
-- Usage:
--   mysql -u <user> -p <db_name> < scripts/seed-roles-admin.sql

START TRANSACTION;

-- 1) Roles
INSERT INTO `roles` (`name`)
VALUES ('STAFF'), ('MANAGER'), ('HEAD'), ('ADMIN')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 2) Ensure a department exists for the admin (department_id is NOT NULL)
INSERT INTO `departments` (`name`, `description`)
VALUES ('IT', 'Information Technology')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

SET @admin_role_id = (SELECT `id` FROM `roles` WHERE `name` = 'ADMIN' LIMIT 1);
SET @it_department_id = (SELECT `id` FROM `departments` WHERE `name` = 'IT' LIMIT 1);

-- bcrypt hash of '12345678'
SET @password_hash = '$2b$10$1E3feNBXRUpEQX2hfkwAV.PNTDbU6FlFpxVz//HsjQlAUyTZvXGJq';

-- 3) Single ADMIN account
INSERT INTO `staffs` (
  `full_name`,
  `email`,
  `password_hash`,
  `role_id`,
  `department_id`,
  `leave_credit`,
  `created_by`
)
VALUES (
  'System Admin',
  'admin@leaveapp.local',
  @password_hash,
  @admin_role_id,
  @it_department_id,
  12.00,
  NULL
)
ON DUPLICATE KEY UPDATE
  `full_name` = VALUES(`full_name`),
  `password_hash` = VALUES(`password_hash`),
  `role_id` = VALUES(`role_id`),
  `department_id` = VALUES(`department_id`);

COMMIT;
