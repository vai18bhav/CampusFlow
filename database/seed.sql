-- CampusFlow Database Seed File
USE campusflow_db;

-- 1. SEED ROLES
INSERT INTO roles (id, name, description) VALUES
(1, 'SUPER_ADMIN', 'Super Administrator with full system privileges and audit controls'),
(2, 'ADMIN', 'Administrative user managing courses, batches, admissions, finance, and users'),
(3, 'SALES_EXECUTIVE', 'Sales Executive handling lead management, inquiries, and conversion'),
(4, 'TRAINER', 'Trainer managing assigned batches, student attendance, assignments, and mock interviews'),
(5, 'SUPPORT_EXECUTIVE', 'Support Executive handling student support requests and notifications'),
(6, 'STUDENT', 'Enrolled student accessing personal profile, attendance, assignments, and finance');

-- 2. SEED USERS (Password for all default demo users is: password123)
-- Hash generated via bcrypt (cost 10): $2b$10$V08M/W6dJpP98v6/a/kYxeS.tH0O9k1Y5z1p98v6/a/kYxeS.tH0O
-- Standard fallback hash: $2a$10$k1wK7Z.aLz/F.H3v9gQ1e.S8B07bUvP7g4jS3M6dG5hJ1K2L3M4N5
INSERT INTO users (id, role_id, full_name, email, password_hash, phone, status) VALUES
(1, 1, 'Super Admin', 'superadmin@campusflow.com', '$2b$10$epAlZ/5fR8Lq3K0oW0e8OuR.1Fm1m6q1Q5G8v7g.H7J1K2L3M4N5O', '+19876543210', 'ACTIVE'),
(2, 2, 'Sarah Admin', 'admin@campusflow.com', '$2b$10$epAlZ/5fR8Lq3K0oW0e8OuR.1Fm1m6q1Q5G8v7g.H7J1K2L3M4N5O', '+19876543211', 'ACTIVE'),
(3, 3, 'Alex Sales', 'sales@campusflow.com', '$2b$10$epAlZ/5fR8Lq3K0oW0e8OuR.1Fm1m6q1Q5G8v7g.H7J1K2L3M4N5O', '+19876543212', 'ACTIVE'),
(4, 4, 'Prof. Robert Trainer', 'trainer@campusflow.com', '$2b$10$epAlZ/5fR8Lq3K0oW0e8OuR.1Fm1m6q1Q5G8v7g.H7J1K2L3M4N5O', '+19876543213', 'ACTIVE'),
(5, 5, 'Emily Support', 'support@campusflow.com', '$2b$10$epAlZ/5fR8Lq3K0oW0e8OuR.1Fm1m6q1Q5G8v7g.H7J1K2L3M4N5O', '+19876543214', 'ACTIVE'),
(6, 6, 'John Doe', 'student@campusflow.com', '$2b$10$epAlZ/5fR8Lq3K0oW0e8OuR.1Fm1m6q1Q5G8v7g.H7J1K2L3M4N5O', '+19876543215', 'ACTIVE'),
(7, 6, 'Jane Smith', 'janesmith@campusflow.com', '$2b$10$epAlZ/5fR8Lq3K0oW0e8OuR.1Fm1m6q1Q5G8v7g.H7J1K2L3M4N5O', '+19876543216', 'ACTIVE'),
(8, 6, 'Michael Brown', 'michael@campusflow.com', '$2b$10$epAlZ/5fR8Lq3K0oW0e8OuR.1Fm1m6q1Q5G8v7g.H7J1K2L3M4N5O', '+19876543217', 'ACTIVE');

-- 3. SEED ROLE DETAILS
INSERT INTO trainers (id, user_id, employee_id, specialization, qualification, experience_years, bio) VALUES
(1, 4, 'EMP-TRN-001', 'Full Stack Web Development & Cloud Architecture', 'M.Tech Computer Science', 8, 'Senior software engineer and trainer with 8+ years experience in Node, React, and MySQL.');

INSERT INTO sales_executives (id, user_id, employee_id, target_conversions) VALUES
(1, 3, 'EMP-SLS-001', 25);

INSERT INTO support_executives (id, user_id, employee_id, department) VALUES
(1, 5, 'EMP-SUP-001', 'Student Operations & Welfare');

INSERT INTO students (id, user_id, roll_number, dob, gender, address, qualification, guardian_name, guardian_phone) VALUES
(1, 6, 'STU-2026-001', '2002-05-15', 'MALE', '123 University Ave, Suite 101', 'B.Tech CS', 'David Doe', '+19876000001'),
(2, 7, 'STU-2026-002', '2003-08-22', 'FEMALE', '456 College Blvd, Apt 4B', 'B.Sc IT', 'Robert Smith', '+19876000002'),
(3, 8, 'STU-2026-003', '2001-11-10', 'MALE', '789 Innovation Way', 'BCA', 'James Brown', '+19876000003');

-- 4. SEED COURSES
INSERT INTO courses (id, code, name, category, description, duration_weeks, fee_amount, status) VALUES
(1, 'FSWD-101', 'Full Stack Web Development (MERN/PERN)', 'Web Development', 'Master Node.js, Express, React, REST APIs, MySQL, and DevOps fundamentals.', 16, 1200.00, 'ACTIVE'),
(2, 'DSML-201', 'Data Science & Machine Learning with Python', 'Data Science', 'Python, Pandas, NumPy, Scikit-Learn, TensorFlow, and SQL Data Pipelines.', 12, 1400.00, 'ACTIVE'),
(3, 'CCDE-301', 'Cloud Computing & DevOps Engineering', 'Cloud & DevOps', 'Docker, Kubernetes, AWS Core Services, Terraform, and CI/CD Pipelines.', 14, 1500.00, 'ACTIVE');

-- 5. SEED BATCHES
INSERT INTO batches (id, course_id, trainer_id, batch_code, name, start_date, end_date, timing, start_time, end_time, room_number, mode, max_students, description, status) VALUES
(1, 1, 1, 'BATCH-FSWD-2026-A', 'Full Stack Web Dev Morning Batch', '2026-02-01', '2026-06-01', '09:00 AM - 12:00 PM', '09:00 AM', '12:00 PM', 'Lab 101', 'OFFLINE', 30, 'Morning intensive hands-on web development batch.', 'ONGOING'),
(2, 2, 1, 'BATCH-DSML-2026-A', 'Data Science Evening Batch', '2026-03-01', '2026-06-15', '04:00 PM - 07:00 PM', '04:00 PM', '07:00 PM', 'Lab 204', 'HYBRID', 25, 'Python data analytics and machine learning pipeline class.', 'ONGOING'),
(3, 3, 1, 'BATCH-CCDE-2026-B', 'DevOps Weekend Masterclass', '2026-09-01', '2026-12-15', '10:00 AM - 04:00 PM', '10:00 AM', '04:00 PM', 'Online Hall A', 'ONLINE', 40, 'Weekend cloud deployment and CI/CD automation masterclass.', 'UPCOMING');

-- 6. BATCH STUDENTS
INSERT INTO batch_students (batch_id, student_id, status) VALUES
(1, 1, 'ENROLLED'),
(1, 2, 'ENROLLED'),
(2, 3, 'ENROLLED');

-- 7. LEADS
INSERT INTO leads (id, sales_exec_id, candidate_name, email, phone, course_id, lead_source, status, notes) VALUES
(1, 1, 'Alice Johnson', 'alice@example.com', '+19875550101', 1, 'WEBSITE', 'CONVERTED', 'Inquired for Full Stack Web Dev. Paid deposit.'),
(2, 1, 'Bob Martinez', 'bob@example.com', '+19875550102', 1, 'WALK_IN', 'IN_PROGRESS', 'Visited campus. Scheduled callback for tomorrow.'),
(3, 1, 'Charlie Davis', 'charlie@example.com', '+19875550103', 2, 'REFERRAL', 'NEW', 'Referred by John Doe. Interested in ML course.');

-- 8. INQUIRIES
INSERT INTO inquiries (id, lead_id, student_id, query, response, status) VALUES
(1, 1, 1, 'Can I get weekend lab access for practice projects?', 'Yes, lab 101 is open on Saturdays from 10 AM to 4 PM.', 'RESOLVED'),
(2, 2, NULL, 'What are the installment choices for the course fee?', 'We offer 3 flexible monthly installments.', 'PENDING');

-- 9. ADMISSIONS
INSERT INTO admissions (id, admission_number, lead_id, student_id, course_id, batch_id, admission_date, total_fee, discount_amount, final_fee, status, remarks, created_by) VALUES
(1, 'ADM-2026-0001', 1, 1, 1, 1, '2026-01-25', 1200.00, 100.00, 1100.00, 'CONFIRMED', 'Initial web development admission.', 1),
(2, 'ADM-2026-0002', NULL, 2, 1, 1, '2026-01-28', 1200.00, 0.00, 1200.00, 'CONFIRMED', 'Direct walk-in admission.', 2),
(3, 'ADM-2026-0003', NULL, 3, 2, 2, '2026-02-15', 1400.00, 150.00, 1250.00, 'CONFIRMED', 'Referral discount applied.', 3);

-- 10. INVOICES, INSTALLMENTS & PAYMENTS
INSERT INTO invoices (id, admission_id, student_id, course_id, invoice_number, total_amount, discount_amount, tax_amount, net_amount, paid_amount, due_amount, invoice_date, due_date, status, created_by) VALUES
(1, 1, 1, 1, 'INV-2026-0001', 1200.00, 100.00, 0.00, 1100.00, 600.00, 500.00, '2026-01-25', '2026-03-30', 'PARTIALLY_PAID', 1),
(2, 2, 2, 1, 'INV-2026-0002', 1200.00, 0.00, 0.00, 1200.00, 1200.00, 0.00, '2026-01-28', '2026-02-28', 'PAID', 2),
(3, 3, 3, 2, 'INV-2026-0003', 1400.00, 150.00, 0.00, 1250.00, 500.00, 750.00, '2026-02-15', '2026-04-15', 'PARTIALLY_PAID', 3);

INSERT INTO installments (id, invoice_id, installment_number, amount, paid_amount, pending_amount, due_date, paid_date, payment_mode, transaction_id, status, remarks) VALUES
(1, 1, 1, 600.00, 600.00, 0.00, '2026-02-01', '2026-01-25', 'UPI', 'TXN-998811', 'PAID', 'Initial admission installment'),
(2, 1, 2, 500.00, 0.00, 500.00, '2026-03-30', NULL, 'ONLINE', NULL, 'PENDING', 'Second term fee installment'),
(3, 2, 1, 1200.00, 1200.00, 0.00, '2026-02-28', '2026-01-28', 'BANK_TRANSFER', 'TXN-776655', 'PAID', 'Full payment with lump sum discount');

INSERT INTO payments (id, invoice_id, installment_id, student_id, amount, payment_date, payment_method, transaction_reference, remarks, received_by) VALUES
(1, 1, 1, 1, 600.00, '2026-01-25', 'UPI', 'UPI-9988112233', 'Initial enrollment fee via UPI', 1),
(2, 2, 3, 2, 1200.00, '2026-01-28', 'BANK_TRANSFER', 'TXN-776655', 'Full tuition payment via NetBanking', 2);

-- 11. ATTENDANCE
INSERT INTO attendance (batch_id, student_id, date, status, marked_by, remarks) VALUES
(1, 1, '2026-08-01', 'PRESENT', 4, 'On time'),
(1, 2, '2026-08-01', 'PRESENT', 4, 'On time'),
(1, 1, '2026-08-02', 'PRESENT', 4, 'Active participation'),
(1, 2, '2026-08-02', 'LATE', 4, '15 mins late due to transport'),
(1, 1, '2026-08-03', 'PRESENT', 4, 'On time'),
(1, 2, '2026-08-03', 'ABSENT', 4, 'Sick leave requested');

-- 12. ASSIGNMENTS & SUBMISSIONS
INSERT INTO assignments (id, course_id, batch_id, trainer_id, title, description, instructions, due_date, deadline, total_marks, max_marks, status) VALUES
(1, 1, 1, 1, 'Build a RESTful API with Express & MySQL', 'Design and implement CRUD routes for an e-commerce catalog using MySQL 8 and Express.js.', 'Submit GitHub repository URL and Postman collection.', '2026-08-20 23:59:00', '2026-08-20 23:59:00', 100, 100, 'PUBLISHED'),
(2, 1, 1, 1, 'React Component Architecture & State Management', 'Create a responsive dashboard using React, Bootstrap 5, and Axios integration.', 'Ensure responsive mobile view and clean folder structure.', '2026-08-28 23:59:00', '2026-08-28 23:59:00', 100, 100, 'PUBLISHED');

INSERT INTO assignment_submissions (assignment_id, student_id, submission_date, submission_text, submission_url, marks_obtained, feedback, status, evaluated_by, reviewed_by, reviewed_at) VALUES
(1, 1, '2026-08-10 14:00:00', 'Submitted GitHub repository link and postman documentation.', 'https://github.com/student1/ecommerce-api', 95, 'Excellent API design and error handling implementation!', 'REVIEWED', 4, 4, '2026-08-11 10:00:00');

-- 13. MOCK INTERVIEWS
INSERT INTO mock_interviews (id, student_id, trainer_id, batch_id, scheduled_date, topic, score, status, feedback, key_strengths, areas_for_improvement) VALUES
(1, 1, 1, 1, '2026-08-15 11:00:00', 'Full Stack System Architecture & JavaScript Fundamentals', 88, 'COMPLETED', 'Great core understanding of async JavaScript, REST APIs, and database indexing.', 'Data structures, REST principles, React state', 'SQL join query optimizations and indexing strategies'),
(2, 2, 1, 1, '2026-08-22 14:30:00', 'Frontend Engineering & CSS Layouts', NULL, 'SCHEDULED', NULL, NULL, NULL);

-- 14. NOTIFICATIONS
INSERT INTO notifications (id, user_id, title, message, type, reference_type, reference_id, is_read) VALUES
(1, 6, 'New Assignment Uploaded', 'Assignment "Build a RESTful API with Express & MySQL" is due on Aug 20, 2026.', 'ASSIGNMENT', 'assignment', 1, 0),
(2, 6, 'Mock Interview Scheduled', 'Your mock interview on Full Stack Architecture is scheduled for Aug 15 at 11:00 AM.', 'INTERVIEW', 'mock_interview', 1, 1),
(3, 6, 'Fee Payment Received', 'Your tuition payment of $600.00 has been recorded successfully.', 'FEE', 'invoice', 1, 0),
(4, 6, 'Assignment Reviewed', 'Your assignment "Build a RESTful API" has been reviewed. Score: 95/100.', 'ASSIGNMENT', 'assignment', 1, 0),
(5, 1, 'System Initialization', 'CampusFlow Training & Admission Portal deployed successfully.', 'GENERAL', NULL, NULL, 1);

-- 15. COUPONS
INSERT INTO coupons (code, discount_type, discount_value, valid_until, max_uses, current_uses, is_active) VALUES
('EARLYBIRD2026', 'PERCENTAGE', 10.00, '2026-12-31', 50, 3, TRUE),
('FLAT100', 'FIXED', 100.00, '2026-12-31', 100, 5, TRUE);
