START TRANSACTION;

INSERT INTO `roles` (`name`)
VALUES ('STAFF'), ('MANAGER'), ('HEAD'), ('ADMIN')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

SET @staff_role_id = (SELECT `id` FROM `roles` WHERE `name` = 'STAFF' LIMIT 1);
SET @manager_role_id = (SELECT `id` FROM `roles` WHERE `name` = 'MANAGER' LIMIT 1);
SET @head_role_id = (SELECT `id` FROM `roles` WHERE `name` = 'HEAD' LIMIT 1);
SET @admin_role_id = (SELECT `id` FROM `roles` WHERE `name` = 'ADMIN' LIMIT 1);

SET @password_hash = '$2b$10$1E3feNBXRUpEQX2hfkwAV.PNTDbU6FlFpxVz//HsjQlAUyTZvXGJq';

INSERT INTO `staffs` (
  `full_name`,
  `email`,
  `smtp_pass`,
  `password_hash`,
  `role_id`,
  `leave_credit`,
  `created_by`
)
VALUES
  ('Nguyen Van Nam', 'nam@leaveapp.local', 'smtp-pass-nam', @password_hash, @admin_role_id, 18.00, NULL),
  ('Tran Thi Ha', 'ha@leaveapp.local', 'smtp-pass-ha', @password_hash, @head_role_id, 15.50, NULL),
  ('Le Van Quan', 'quan@leaveapp.local', 'smtp-pass-quan', @password_hash, @manager_role_id, 14.00, NULL),
  ('Nguyen Van An', 'an@leaveapp.local', 'smtp-pass-an', @password_hash, @staff_role_id, 12.00, NULL),
  ('Pham Minh Binh', 'binh@leaveapp.local', 'smtp-pass-binh', @password_hash, @staff_role_id, 11.50, NULL)
ON DUPLICATE KEY UPDATE
  `full_name` = VALUES(`full_name`),
  `password_hash` = VALUES(`password_hash`),
  `role_id` = VALUES(`role_id`),
  `leave_credit` = VALUES(`leave_credit`);

SET @admin_staff_id = (
  SELECT `id` FROM `staffs` WHERE `email` = 'nam@leaveapp.local' LIMIT 1
);
SET @head_staff_id = (
  SELECT `id` FROM `staffs` WHERE `email` = 'ha@leaveapp.local' LIMIT 1
);
SET @manager_staff_id = (
  SELECT `id` FROM `staffs` WHERE `email` = 'quan@leaveapp.local' LIMIT 1
);
SET @staff_an_id = (
  SELECT `id` FROM `staffs` WHERE `email` = 'an@leaveapp.local' LIMIT 1
);
SET @staff_binh_id = (
  SELECT `id` FROM `staffs` WHERE `email` = 'binh@leaveapp.local' LIMIT 1
);

UPDATE `staffs`
SET `created_by` = @admin_staff_id
WHERE `email` IN (
  'ha@leaveapp.local',
  'quan@leaveapp.local',
  'an@leaveapp.local',
  'binh@leaveapp.local'
);

INSERT INTO `leave_requests` (
  `staff_id`,
  `leave_date`,
  `type`,
  `reason`,
  `status`,
  `resolved_by`,
  `reject_reason`,
  `resolved_at`
)
VALUES
  (@staff_an_id, '2026-05-05', 'FULL', 'Family matters', 'APPROVED', @manager_staff_id, NULL, '2026-05-03 09:00:00.000'),
  (@staff_binh_id, '2026-05-06', 'MORNING', 'Medical checkup', 'REJECTED', @head_staff_id, 'Team meeting overlap', '2026-05-04 14:30:00.000'),
  (@staff_an_id, '2026-05-10', 'AFTERNOON', 'Personal errand', 'PENDING', NULL, NULL, NULL)
ON DUPLICATE KEY UPDATE
  `type` = VALUES(`type`),
  `reason` = VALUES(`reason`),
  `status` = VALUES(`status`),
  `resolved_by` = VALUES(`resolved_by`),
  `reject_reason` = VALUES(`reject_reason`),
  `resolved_at` = VALUES(`resolved_at`);

COMMIT;
