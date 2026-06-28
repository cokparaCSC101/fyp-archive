-- =====================================================================
--  Add registered lecturers to the supervisor dropdown.
--  Keeps all existing supervisor names. Safe to run more than once.
-- =====================================================================

-- 1) Link a supervisor row to a user account (lecturers).
ALTER TABLE supervisors
  ADD COLUMN user_id INT NULL UNIQUE,
  ADD CONSTRAINT fk_sup_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL;

-- 2) Backfill: make every existing lecturer selectable as a supervisor.
INSERT IGNORE INTO supervisors (full_name, department, user_id)
SELECT u.full_name, 'Computer Science', u.user_id
FROM users u
WHERE u.role = 'lecturer';
