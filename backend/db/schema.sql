-- =====================================================================
--  FYP ARCHIVE SYSTEM — DATABASE SCHEMA
--  A Cross-Platform Final Year Project Archive and Retrieval System
--  Case Study: Computer Science Department, Pan-Atlantic University
--
--  Three relational tables: Supervisors, Users, Projects
--  Relationships:
--    - one Supervisor  ->  many Projects   (supervisor_id FK)
--    - one admin User  ->  many Projects   (added_by FK)
-- =====================================================================

-- Create and select the database
CREATE DATABASE IF NOT EXISTS fyp_archive
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE fyp_archive;

-- Drop in dependency order so the script is re-runnable during development
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS supervisors;

-- ---------------------------------------------------------------------
--  SUPERVISORS
-- ---------------------------------------------------------------------
CREATE TABLE supervisors (
  supervisor_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(150) NOT NULL,
  department    VARCHAR(150) NOT NULL DEFAULT 'Computer Science'
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
--  USERS
--  role is constrained to the four roles in the system design.
--  'admin' has full CRUD; 'student', 'lecturer', 'hod' are read-only.
-- ---------------------------------------------------------------------
CREATE TABLE users (
  user_id       INT AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(150) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin', 'student', 'lecturer', 'hod') NOT NULL DEFAULT 'student',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
--  PROJECTS
--  project_link is nullable (external link to the full document).
-- ---------------------------------------------------------------------
CREATE TABLE projects (
  project_id     INT AUTO_INCREMENT PRIMARY KEY,
  title          VARCHAR(300) NOT NULL,
  student_name   VARCHAR(200) NOT NULL,
  year_completed INT NOT NULL,
  abstract       TEXT NOT NULL,
  project_link   VARCHAR(500) NULL,
  supervisor_id  INT NOT NULL,
  added_by       INT NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_project_supervisor
    FOREIGN KEY (supervisor_id) REFERENCES supervisors(supervisor_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT fk_project_added_by
    FOREIGN KEY (added_by) REFERENCES users(user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Indexes to keep keyword + year searches fast as the archive grows
CREATE INDEX idx_projects_year  ON projects (year_completed);
CREATE INDEX idx_projects_title ON projects (title);
CREATE FULLTEXT INDEX idx_projects_search ON projects (title, student_name, abstract);
