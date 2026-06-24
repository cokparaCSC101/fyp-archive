-- =====================================================================
--  FYP ARCHIVE SYSTEM — MIGRATION: 2026 system improvements (Phase 1)
--  Run this ONCE against an EXISTING database (local and Aiven).
--  It preserves all existing data: it only ADDs columns and tables.
--
--    Local:  mysql -u root -p fyp_archive < db/migration_2026_improvements.sql
--    Aiven:  mysql --user avnadmin --password=<pw> \
--              --host <host> --port <port> --ssl \
--              defaultdb < db/migration_2026_improvements.sql
--    (use whatever DB_NAME your app actually uses)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) USERS — email sign-up verification
-- ---------------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN is_verified          TINYINT(1)   NOT NULL DEFAULT 0 AFTER role,
  ADD COLUMN verification_code    VARCHAR(10)  NULL              AFTER is_verified,
  ADD COLUMN verification_expires DATETIME     NULL              AFTER verification_code;

-- Existing accounts are already in use — mark them verified so nobody is locked out.
UPDATE users SET is_verified = 1;

-- ---------------------------------------------------------------------
-- 2) PROJECTS — optional link to the student's project web app
-- ---------------------------------------------------------------------
ALTER TABLE projects
  ADD COLUMN project_webapp_link VARCHAR(500) NULL AFTER project_link;

-- ---------------------------------------------------------------------
-- 3) PROJECT REQUESTS — moderation queue
--    A lecturer's create / update / delete becomes a pending request
--    here; the HoD approves or denies it. Admin & HoD act immediately
--    and do NOT use this table.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_requests (
  request_id          INT AUTO_INCREMENT PRIMARY KEY,
  action              ENUM('create','update','delete') NOT NULL,
  target_project_id   INT NULL,                 -- set for update / delete
  -- proposed project fields (used for create / update)
  title               VARCHAR(300) NULL,
  student_name        VARCHAR(200) NULL,
  year_completed      INT NULL,
  abstract            TEXT NULL,
  project_link        VARCHAR(500) NULL,
  project_webapp_link VARCHAR(500) NULL,
  supervisor_id       INT NULL,
  -- similarity check result (computed when the request is created)
  similarity_score    DECIMAL(5,2) NULL,        -- highest % match found
  similarity_info     TEXT NULL,                -- JSON: the closest matches
  -- workflow
  status              ENUM('pending','approved','denied') NOT NULL DEFAULT 'pending',
  requested_by        INT NOT NULL,             -- the lecturer
  reviewed_by         INT NULL,                 -- the HoD who decided
  reviewed_at         DATETIME NULL,
  review_note         VARCHAR(500) NULL,        -- reason on denial
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_req_target      FOREIGN KEY (target_project_id) REFERENCES projects(project_id)    ON DELETE CASCADE,
  CONSTRAINT fk_req_requested   FOREIGN KEY (requested_by)      REFERENCES users(user_id)          ON DELETE CASCADE,
  CONSTRAINT fk_req_reviewed    FOREIGN KEY (reviewed_by)       REFERENCES users(user_id)          ON DELETE SET NULL,
  CONSTRAINT fk_req_supervisor  FOREIGN KEY (supervisor_id)     REFERENCES supervisors(supervisor_id) ON DELETE SET NULL,
  INDEX idx_req_status (status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4) AUDIT LOG — who did what (upload, view, approve, etc.)
--    Visible to the HoD.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  log_id     INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NULL,
  action     VARCHAR(50) NOT NULL,    -- view_project, create_project, request_create, approve_request, ...
  project_id INT NULL,
  details    VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_audit_user    FOREIGN KEY (user_id)    REFERENCES users(user_id)       ON DELETE SET NULL,
  CONSTRAINT fk_audit_project FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE SET NULL,
  INDEX idx_audit_project (project_id),
  INDEX idx_audit_action  (action),
  INDEX idx_audit_user    (user_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5) COMPLAINTS — user feedback / complaints to the admin, with status
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaints (
  complaint_id   INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT NOT NULL,
  project_id     INT NULL,                 -- optional: the project it concerns
  subject        VARCHAR(200) NOT NULL,
  message        TEXT NOT NULL,
  status         ENUM('open','seen','in_progress','resolved') NOT NULL DEFAULT 'open',
  admin_response VARCHAR(1000) NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_complaint_user    FOREIGN KEY (user_id)    REFERENCES users(user_id)       ON DELETE CASCADE,
  CONSTRAINT fk_complaint_project FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE SET NULL,
  INDEX idx_complaint_status (status),
  INDEX idx_complaint_user   (user_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 6) TEST ACCOUNTS for the new roles (so you can try the workflow).
--    INSERT IGNORE => skipped automatically if the email already exists.
--    Passwords:  hod@pau.edu.ng -> Hod@123    lecturer@pau.edu.ng -> Lecturer@123
--    (Change or remove these before real use.)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO users (full_name, email, password_hash, role, is_verified) VALUES
  ('Head of Department', 'hod@pau.edu.ng',
   '$2b$10$EidbrGLY0unY8ssxtA4WPe5yxiQJllbNRXCV6V3Od96PMMwyba4BK', 'hod', 1),
  ('Sample Lecturer',    'lecturer@pau.edu.ng',
   '$2b$10$INKRYskRMSWtgOrI7bl82ucrqKovj8J5W38GSIGIEK7Orw5n9ZDTq', 'lecturer', 1);
