-- =====================================================================
--  FYP ARCHIVE SYSTEM — SEED DATA
--  Run AFTER schema.sql:   mysql -u root -p < db/schema.sql
--                          mysql -u root -p fyp_archive < db/seed.sql
--
--  DEFAULT LOGIN CREDENTIALS (for testing / first login):
--    Admin    ->  email: admin@pau.edu.ng     password: Admin@123
--    Student  ->  email: student@pau.edu.ng   password: Student@123
--
--  IMPORTANT: change these passwords before any real deployment.
-- =====================================================================

USE fyp_archive;

-- ---------------------------------------------------------------------
--  SUPERVISORS
-- ---------------------------------------------------------------------
INSERT INTO supervisors (supervisor_id, full_name, department) VALUES
  (1, 'Solomon Alile',        'Computer Science'),
  (2, 'Dr. Anthonia Adeniji', 'Computer Science'),
  (3, 'Dr. Olufemi Bakare',   'Computer Science'),
  (4, 'Mrs. Grace Okonkwo',   'Computer Science');

-- ---------------------------------------------------------------------
--  USERS
--  password_hash values are real bcrypt hashes of the passwords above.
-- ---------------------------------------------------------------------
INSERT INTO users (user_id, full_name, email, password_hash, role) VALUES
  (1, 'System Administrator', 'admin@pau.edu.ng',
      '$2a$10$Fz9r3qyQ42kff/3QYcdbmOI6IlU67TgLyjLw2PfRUhDXqv5HWhd66', 'admin'),
  (2, 'Clinton Okpara',       'student@pau.edu.ng',
      '$2a$10$WP5MDtCnK9pQZ.ulpi71xOhXzYEXR1DuAekabqzd9efyj1/DEKmla', 'student');

-- ---------------------------------------------------------------------
--  PROJECTS  (sample archive entries — all added_by the admin, user_id 1)
-- ---------------------------------------------------------------------
INSERT INTO projects
  (title, student_name, year_completed, abstract, project_link, supervisor_id, added_by)
VALUES
  ('A Cross-Platform Final Year Project Archive and Retrieval System',
   'Clinton Okpara', 2025,
   'This project presents a cross-platform system, comprising a React.js web application and a React Native mobile application sharing a single Node.js/Express backend and MySQL database, that enables Computer Science students and staff at Pan-Atlantic University to browse, search, and retrieve records of past final year projects. The system addresses the absence of a centralised, searchable archive in the department.',
   NULL, 1, 1),

  ('An Intelligent Timetable Scheduling System for University Departments',
   'Adaeze Nwosu', 2024,
   'A constraint-satisfaction approach to automatically generate clash-free lecture timetables, reducing the manual effort traditionally required by department coordinators. The system models lecturers, courses, rooms, and time slots as variables and applies a backtracking algorithm to find feasible schedules.',
   'https://example.com/projects/timetable-scheduling.pdf', 2, 1),

  ('A Machine Learning Model for Predicting Student Academic Performance',
   'Ibrahim Lawal', 2024,
   'This study develops and compares several supervised learning models to predict final CGPA from early academic and demographic indicators, with the aim of enabling timely academic intervention. Logistic regression, decision trees, and a random forest classifier are evaluated on a historical dataset.',
   'https://example.com/projects/student-performance-ml.pdf', 3, 1),

  ('A Blockchain-Based Certificate Verification Platform',
   'Funmilayo Adeyemi', 2023,
   'A decentralised application that issues and verifies academic certificates using smart contracts, eliminating fraudulent credentials and removing the need for slow manual verification by institutions. Certificates are hashed and anchored on-chain while documents remain off-chain.',
   NULL, 1, 1),

  ('An IoT-Based Smart Energy Monitoring System for Campus Buildings',
   'Chukwuemeka Eze', 2023,
   'A low-cost Internet of Things solution that measures and visualises real-time electricity consumption across campus buildings, helping facility managers identify waste and reduce energy costs. Sensor data is streamed to a cloud dashboard with configurable alerts.',
   'https://example.com/projects/iot-energy-monitoring.pdf', 4, 1),

  ('A Sentiment Analysis Engine for Course Evaluation Feedback',
   'Blessing Okafor', 2022,
   'This project applies natural language processing to free-text student course-evaluation comments, classifying sentiment and surfacing recurring themes to give faculty actionable insight beyond numeric ratings. A fine-tuned transformer model is benchmarked against a classical TF-IDF baseline.',
   NULL, 2, 1),

  ('A Mobile-First E-Health Appointment Booking Application',
   'Daniel Ojo', 2022,
   'A React Native application enabling patients to book, reschedule, and receive reminders for clinic appointments, designed to reduce no-shows and waiting-room congestion at the university medical centre. The backend exposes a REST API with role-based access for patients and staff.',
   'https://example.com/projects/ehealth-booking.pdf', 3, 1);
