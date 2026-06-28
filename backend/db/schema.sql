-- =====================================================================
--  FYP ARCHIVE SYSTEM — DATABASE SCHEMA  (v2: 2026 improvements)
--  A Cross-Platform Final Year Project Archive and Retrieval System
--  Case Study: Computer Science Department, Pan-Atlantic University
--
--  Roles & permissions:
--    student  -> read-only
--    lecturer -> create/update/delete as REQUESTS (need HoD approval)
--    hod      -> approves/denies requests; full CRUD; sees audit log
--    admin    -> technical owner; full CRUD; handles complaints
-- =====================================================================

CREATE DATABASE IF NOT EXISTS fyp_archive
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fyp_archive;

-- Re-runnable during development (drop in dependency order)
DROP TABLE IF EXISTS complaints;
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS project_requests;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS supervisors;

-- ---------------------------------------------------------------------
--  SUPERVISORS
-- ---------------------------------------------------------------------
CREATE TABLE supervisors (
  supervisor_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(150) NOT NULL,
  department    VARCHAR(150) NOT NULL DEFAULT 'Computer Science',
  user_id       INT NULL UNIQUE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
--  USERS  (four roles; email verified at sign-up)
-- ---------------------------------------------------------------------
CREATE TABLE users (
  user_id              INT AUTO_INCREMENT PRIMARY KEY,
  full_name            VARCHAR(150) NOT NULL,
  email                VARCHAR(150) NOT NULL UNIQUE,
  password_hash        VARCHAR(255) NOT NULL,
  role                 ENUM('admin','student','lecturer','hod') NOT NULL DEFAULT 'student',
  is_verified          TINYINT(1)   NOT NULL DEFAULT 0,
  verification_code    VARCHAR(10)  NULL,
  verification_expires DATETIME     NULL,
  created_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Link supervisors to lecturer accounts (added here, once users exists).
ALTER TABLE supervisors
  ADD CONSTRAINT fk_sup_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
--  PROJECTS  (live/approved entries)
-- ---------------------------------------------------------------------
CREATE TABLE projects (
  project_id          INT AUTO_INCREMENT PRIMARY KEY,
  title               VARCHAR(300) NOT NULL,
  student_name        VARCHAR(200) NOT NULL,
  year_completed      INT NOT NULL,
  abstract            TEXT NOT NULL,
  project_link        VARCHAR(500) NULL,
  project_webapp_link VARCHAR(500) NULL,
  supervisor_id       INT NOT NULL,
  added_by            INT NOT NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_project_supervisor FOREIGN KEY (supervisor_id) REFERENCES supervisors(supervisor_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_project_added_by   FOREIGN KEY (added_by)      REFERENCES users(user_id)            ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX idx_projects_year  ON projects (year_completed);
CREATE INDEX idx_projects_title ON projects (title);
CREATE FULLTEXT INDEX idx_projects_search ON projects (title, student_name, abstract);

-- ---------------------------------------------------------------------
--  PROJECT REQUESTS  (moderation queue: lecturer actions await HoD)
-- ---------------------------------------------------------------------
CREATE TABLE project_requests (
  request_id          INT AUTO_INCREMENT PRIMARY KEY,
  action              ENUM('create','update','delete') NOT NULL,
  target_project_id   INT NULL,
  title               VARCHAR(300) NULL,
  student_name        VARCHAR(200) NULL,
  year_completed      INT NULL,
  abstract            TEXT NULL,
  project_link        VARCHAR(500) NULL,
  project_webapp_link VARCHAR(500) NULL,
  supervisor_id       INT NULL,
  similarity_score    DECIMAL(5,2) NULL,
  similarity_info     TEXT NULL,
  status              ENUM('pending','approved','denied') NOT NULL DEFAULT 'pending',
  requested_by        INT NOT NULL,
  reviewed_by         INT NULL,
  reviewed_at         DATETIME NULL,
  review_note         VARCHAR(500) NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_req_target     FOREIGN KEY (target_project_id) REFERENCES projects(project_id)       ON DELETE CASCADE,
  CONSTRAINT fk_req_requested  FOREIGN KEY (requested_by)      REFERENCES users(user_id)             ON DELETE CASCADE,
  CONSTRAINT fk_req_reviewed   FOREIGN KEY (reviewed_by)       REFERENCES users(user_id)             ON DELETE SET NULL,
  CONSTRAINT fk_req_supervisor FOREIGN KEY (supervisor_id)     REFERENCES supervisors(supervisor_id) ON DELETE SET NULL,
  INDEX idx_req_status (status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
--  AUDIT LOG  (who uploaded / viewed / approved; visible to HoD)
-- ---------------------------------------------------------------------
CREATE TABLE audit_log (
  log_id     INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NULL,
  action     VARCHAR(50) NOT NULL,
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
--  COMPLAINTS  (feedback to admin, with status tracking)
-- ---------------------------------------------------------------------
CREATE TABLE complaints (
  complaint_id   INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT NOT NULL,
  project_id     INT NULL,
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
