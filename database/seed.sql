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

-- 2. SEED USERS (Role-specific default passwords: SuperAdmin@2026, Admin@2026, SalesExec@2026, Trainer@2026, SupportExec@2026, Student@2026)
INSERT INTO users (id, role_id, full_name, email, password_hash, phone, status) VALUES
(1, 1, 'Super Admin', 'superadmin@campusflow.com', '$2b$10$epAlZ/5fR8Lq3K0oW0e8OuR.1Fm1m6q1Q5G8v7g.H7J1K2L3M4N5O', '+919876543210', 'ACTIVE'),
(2, 2, 'Sarah Admin', 'admin@campusflow.com', '$2b$10$epAlZ/5fR8Lq3K0oW0e8OuR.1Fm1m6q1Q5G8v7g.H7J1K2L3M4N5O', '+919876543211', 'ACTIVE'),
(3, 3, 'Alex Sales', 'sales@campusflow.com', '$2b$10$epAlZ/5fR8Lq3K0oW0e8OuR.1Fm1m6q1Q5G8v7g.H7J1K2L3M4N5O', '+919876543212', 'ACTIVE'),
(4, 4, 'Prof. Robert Trainer', 'trainer@campusflow.com', '$2b$10$epAlZ/5fR8Lq3K0oW0e8OuR.1Fm1m6q1Q5G8v7g.H7J1K2L3M4N5O', '+919876543213', 'ACTIVE'),
(5, 5, 'Emily Support', 'support@campusflow.com', '$2b$10$epAlZ/5fR8Lq3K0oW0e8OuR.1Fm1m6q1Q5G8v7g.H7J1K2L3M4N5O', '+919876543214', 'ACTIVE'),
(6, 6, 'John Doe', 'student@campusflow.com', '$2b$10$epAlZ/5fR8Lq3K0oW0e8OuR.1Fm1m6q1Q5G8v7g.H7J1K2L3M4N5O', '+919876543215', 'ACTIVE'),
(7, 6, 'Jane Smith', 'janesmith@campusflow.com', '$2b$10$epAlZ/5fR8Lq3K0oW0e8OuR.1Fm1m6q1Q5G8v7g.H7J1K2L3M4N5O', '+919876543216', 'ACTIVE'),
(8, 6, 'Michael Brown', 'michael@campusflow.com', '$2b$10$epAlZ/5fR8Lq3K0oW0e8OuR.1Fm1m6q1Q5G8v7g.H7J1K2L3M4N5O', '+919876543217', 'ACTIVE');

-- 3. SEED ROLE DETAILS
INSERT INTO trainers (id, user_id, employee_id, specialization, qualification, experience_years, bio) VALUES
(1, 4, 'EMP-TRN-001', 'Full Stack Web Development & Cloud Architecture', 'M.Tech Computer Science', 8, 'Senior software engineer and trainer with 8+ years experience in Node, React, and MySQL.');

INSERT INTO sales_executives (id, user_id, employee_id, target_conversions) VALUES
(1, 3, 'EMP-SLS-001', 25);

INSERT INTO support_executives (id, user_id, employee_id, department) VALUES
(1, 5, 'EMP-SUP-001', 'Student Operations & Welfare');

INSERT INTO students (id, user_id, roll_number, dob, gender, address, qualification, guardian_name, guardian_phone, mock_interview_credits, mock_credits_total, mock_credits_used, mock_credit_expiry, mock_credits_expiry) VALUES
(1, 6, 'STU-2026-001', '2002-05-15', 'MALE', '123 University Ave, Suite 101', 'B.Tech CS', 'David Doe', '+919876000001', 8, 8, 2, '2026-12-31', '2026-12-31'),
(2, 7, 'STU-2026-002', '2003-08-22', 'FEMALE', '456 College Blvd, Apt 4B', 'B.Sc IT', 'Robert Smith', '+919876000002', 5, 5, 1, '2026-12-31', '2026-12-31'),
(3, 8, 'STU-2026-003', '2001-11-10', 'MALE', '789 Innovation Way', 'BCA', 'James Brown', '+919876000003', 3, 3, 0, '2026-12-31', '2026-12-31');

-- 4. SEED COURSES
INSERT INTO courses (id, code, name, category, description, duration_weeks, fee_amount, status) VALUES
(1, 'FSWD-101', 'Full Stack Web Development (MERN/PERN)', 'Web Development', 'Master Node.js, Express, React, REST APIs, MySQL, and DevOps fundamentals.', 16, 65000.00, 'ACTIVE'),
(2, 'DSML-201', 'Data Science & Machine Learning with Python', 'Data Science', 'Python, Pandas, NumPy, Scikit-Learn, TensorFlow, and SQL Data Pipelines.', 12, 55500.00, 'ACTIVE'),
(3, 'CCDE-301', 'Cloud Computing & DevOps Engineering', 'Cloud & DevOps', 'Docker, Kubernetes, AWS Core Services, Terraform, and CI/CD Pipelines.', 14, 75000.00, 'ACTIVE');

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
(1, 1, 'Alice Johnson', 'alice@example.com', '+919875550101', 1, 'WEBSITE', 'CONVERTED', 'Inquired for Full Stack Web Dev. Paid deposit.'),
(2, 1, 'Bob Martinez', 'bob@example.com', '+919875550102', 1, 'WALK_IN', 'IN_PROGRESS', 'Visited campus. Scheduled callback for tomorrow.'),
(3, 1, 'Charlie Davis', 'charlie@example.com', '+919875550103', 2, 'REFERRAL', 'NEW', 'Referred by John Doe. Interested in ML course.');

-- 8. INQUIRIES
INSERT INTO inquiries (id, lead_id, student_id, query, response, status) VALUES
(1, 1, 1, 'Can I get weekend lab access for practice projects?', 'Yes, lab 101 is open on Saturdays from 10 AM to 4 PM.', 'RESOLVED'),
(2, 2, NULL, 'What are the installment choices for the course fee?', 'We offer 3 flexible monthly installments.', 'PENDING');

-- 9. ADMISSIONS
INSERT INTO admissions (id, admission_number, lead_id, student_id, course_id, batch_id, admission_date, total_fee, discount_amount, final_fee, status, currency, remarks, created_by) VALUES
(1, 'ADM-2026-0001', 1, 1, 1, 1, '2026-01-25', 65000.00, 5000.00, 60000.00, 'CONFIRMED', 'INR', 'Initial web development admission.', 1),
(2, 'ADM-2026-0002', NULL, 2, 3, 1, '2026-01-28', 75000.00, 5000.00, 70000.00, 'CONFIRMED', 'INR', 'Direct walk-in admission with lump-sum discount.', 2),
(3, 'ADM-2026-0003', NULL, 3, 2, 2, '2026-02-15', 55500.00, 0.00, 55500.00, 'CONFIRMED', 'INR', 'Standard enrollment.', 3);

-- 10. INVOICES, INSTALLMENTS & PAYMENTS
-- Net Total Revenue: 60,000 + 70,000 + 55,500 = ₹185,500.00
-- Total Collected: 55,000 + 70,000 + 48,000 = ₹173,000.00
-- Total Pending: 5,000 + 0 + 7,500 = ₹12,500.00
-- Overdue Amount: ₹7,500.00 (Invoice 3 installment due 2026-09-15)

INSERT INTO invoices (id, admission_id, student_id, course_id, invoice_number, total_amount, discount_amount, tax_amount, net_amount, paid_amount, due_amount, invoice_date, due_date, currency, status, created_by) VALUES
(1, 1, 1, 1, 'INV-2026-0001', 65000.00, 5000.00, 0.00, 60000.00, 55000.00, 5000.00, '2026-01-25', '2026-10-30', 'INR', 'PARTIALLY_PAID', 1),
(2, 2, 2, 3, 'INV-2026-0002', 75000.00, 5000.00, 0.00, 70000.00, 70000.00, 0.00, '2026-01-28', '2026-02-28', 'INR', 'PAID', 2),
(3, 3, 3, 2, 'INV-2026-0003', 55500.00, 0.00, 0.00, 55500.00, 48000.00, 7500.00, '2026-02-15', '2026-09-15', 'INR', 'OVERDUE', 3);

INSERT INTO installments (id, invoice_id, installment_number, amount, paid_amount, pending_amount, due_date, paid_date, payment_mode, transaction_id, status, remarks) VALUES
(1, 1, 1, 35000.00, 35000.00, 0.00, '2026-02-15', '2026-01-25', 'UPI', 'UPI-9988112233', 'PAID', 'First installment'),
(2, 1, 2, 20000.00, 20000.00, 0.00, '2026-05-15', '2026-03-15', 'UPI', 'UPI-9988114455', 'PAID', 'Second installment'),
(3, 1, 3, 5000.00, 0.00, 5000.00, '2026-10-30', NULL, 'ONLINE', NULL, 'PENDING', 'Final balance installment'),
(4, 2, 1, 70000.00, 70000.00, 0.00, '2026-02-28', '2026-01-28', 'BANK_TRANSFER', 'TXN-776655', 'PAID', 'Lump sum payment'),
(5, 3, 1, 48000.00, 48000.00, 0.00, '2026-03-15', '2026-02-15', 'UPI', 'UPI-7788990011', 'PAID', 'Initial deposit'),
(6, 3, 2, 7500.00, 0.00, 7500.00, '2026-09-15', NULL, 'ONLINE', NULL, 'OVERDUE', 'Final term installment past due');

INSERT INTO payments (id, invoice_id, installment_id, student_id, amount, payment_date, payment_method, transaction_reference, remarks, received_by) VALUES
(1, 1, 1, 1, 35000.00, '2026-01-25', 'UPI', 'UPI-9988112233', 'First installment via UPI', 1),
(2, 1, 2, 1, 20000.00, '2026-03-15', 'UPI', 'UPI-9988114455', 'Second installment via UPI', 1),
(3, 2, 4, 2, 70000.00, '2026-01-28', 'BANK_TRANSFER', 'TXN-776655', 'Full tuition payment via NetBanking', 2),
(4, 3, 5, 3, 48000.00, '2026-02-15', 'UPI', 'UPI-7788990011', 'Initial payment via GooglePay', 3);

-- 11. ATTENDANCE (Rich history for Student 1 & 2)
INSERT INTO attendance (batch_id, student_id, date, status, marked_by, remarks) VALUES
(1, 1, '2026-09-01', 'PRESENT', 4, 'On time - Active in React workshop'),
(1, 2, '2026-09-01', 'PRESENT', 4, 'On time'),
(1, 1, '2026-09-02', 'PRESENT', 4, 'On time - Lab exercise completed'),
(1, 2, '2026-09-02', 'LATE', 4, '10 mins late due to transport'),
(1, 1, '2026-09-03', 'PRESENT', 4, 'On time'),
(1, 2, '2026-09-03', 'PRESENT', 4, 'On time'),
(1, 1, '2026-09-04', 'PRESENT', 4, 'On time'),
(1, 2, '2026-09-04', 'PRESENT', 4, 'On time'),
(1, 1, '2026-09-05', 'PRESENT', 4, 'On time'),
(1, 2, '2026-09-05', 'ABSENT', 4, 'Medical leave'),
(1, 1, '2026-09-08', 'PRESENT', 4, 'On time - Express API module'),
(1, 2, '2026-09-08', 'PRESENT', 4, 'On time'),
(1, 1, '2026-09-09', 'PRESENT', 4, 'On time'),
(1, 2, '2026-09-09', 'PRESENT', 4, 'On time'),
(1, 1, '2026-09-10', 'PRESENT', 4, 'On time'),
(1, 2, '2026-09-10', 'PRESENT', 4, 'On time'),
(1, 1, '2026-09-11', 'LATE', 4, '5 mins late - Excused'),
(1, 2, '2026-09-11', 'PRESENT', 4, 'On time'),
(1, 1, '2026-09-12', 'PRESENT', 4, 'On time - System Design Session'),
(1, 2, '2026-09-12', 'PRESENT', 4, 'On time'),
(1, 1, '2026-09-15', 'PRESENT', 4, 'On time'),
(1, 2, '2026-09-15', 'PRESENT', 4, 'On time'),
(1, 1, '2026-09-16', 'PRESENT', 4, 'On time'),
(1, 2, '2026-09-16', 'LATE', 4, '15 mins late'),
(1, 1, '2026-09-17', 'PRESENT', 4, 'On time'),
(1, 2, '2026-09-17', 'PRESENT', 4, 'On time'),
(1, 1, '2026-09-18', 'PRESENT', 4, 'On time'),
(1, 2, '2026-09-18', 'PRESENT', 4, 'On time'),
(1, 1, '2026-09-21', 'PRESENT', 4, 'On time - Capstone kick-off'),
(1, 2, '2026-09-21', 'PRESENT', 4, 'On time'),
(1, 1, '2026-09-22', 'PRESENT', 4, 'On time'),
(1, 2, '2026-09-22', 'PRESENT', 4, 'On time'),
(1, 1, '2026-09-23', 'PRESENT', 4, 'On time'),
(1, 2, '2026-09-23', 'PRESENT', 4, 'On time'),
(1, 1, '2026-09-24', 'PRESENT', 4, 'On time'),
(1, 2, '2026-09-24', 'PRESENT', 4, 'On time'),
(1, 1, '2026-09-25', 'PRESENT', 4, 'On time'),
(1, 2, '2026-09-25', 'PRESENT', 4, 'On time');

-- 12. ASSIGNMENTS & SUBMISSIONS
INSERT INTO assignments (id, course_id, batch_id, trainer_id, title, description, instructions, due_date, deadline, total_marks, max_marks, status) VALUES
(1, 1, 1, 1, 'Build a RESTful API with Express & MySQL', 'Design and implement CRUD routes for an e-commerce catalog using MySQL 8 and Express.js.', 'Submit GitHub repository URL and Postman collection.', '2026-09-10 23:59:00', '2026-09-10 23:59:00', 100, 100, 'PUBLISHED'),
(2, 1, 1, 1, 'React Component Architecture & State Management', 'Create a responsive dashboard using React, Bootstrap 5, and Axios integration.', 'Ensure responsive mobile view and clean folder structure.', '2026-09-20 23:59:00', '2026-09-20 23:59:00', 100, 100, 'PUBLISHED'),
(3, 1, 1, 1, 'Database Indexing & Complex SQL Queries', 'Optimize MySQL queries using indexes, joins, and views for scalable analytics.', 'Attach EXPLAIN query plans and SQL script file.', '2026-10-05 23:59:00', '2026-10-05 23:59:00', 100, 100, 'PUBLISHED'),
(4, 1, 1, 1, 'Full Stack Capstone Project Proposal', 'Draft architectural diagram, database schema ERD, and wireframes for your capstone project.', 'Upload PDF document and GitHub repository link.', '2026-10-15 23:59:00', '2026-10-15 23:59:00', 100, 100, 'PUBLISHED');

INSERT INTO assignment_submissions (assignment_id, student_id, submission_date, submission_text, submission_url, marks_obtained, feedback, status, evaluated_by, reviewed_by, reviewed_at) VALUES
(1, 1, '2026-09-08 14:00:00', 'Submitted Express REST API solution with Postman collection and MySQL schema script.', 'https://github.com/johndoe/ecommerce-rest-api', 95, 'Outstanding work! Clean route architecture, parameterized queries, and great validation.', 'REVIEWED', 4, 4, '2026-09-09 10:00:00'),
(2, 1, '2026-09-18 16:30:00', 'Implemented React dashboard with custom hooks and responsive Bootstrap 5 theme.', 'https://github.com/johndoe/campusflow-react-dashboard', 92, 'Great state management and clean UI component separation!', 'REVIEWED', 4, 4, '2026-09-19 11:30:00'),
(1, 2, '2026-09-09 18:00:00', 'Submitted REST API codebase.', 'https://github.com/janesmith/api-express', 88, 'Good structure. Add rate limiting middleware for production.', 'REVIEWED', 4, 4, '2026-09-10 09:15:00');

-- 13. MOCK INTERVIEWS
INSERT INTO mock_interviews (id, student_id, trainer_id, batch_id, scheduled_date, topic, score, status, feedback, key_strengths, areas_for_improvement) VALUES
(1, 1, 1, 1, '2026-09-05 11:00:00', 'Full Stack System Architecture & JavaScript Fundamentals', 88, 'COMPLETED', 'Great core understanding of async JavaScript, REST APIs, and database indexing.', 'Data structures, REST principles, React state', 'SQL join query optimizations and indexing strategies'),
(2, 1, 1, 1, '2026-09-22 14:00:00', 'React State Management & Performance Optimization', 92, 'COMPLETED', 'Excellent grasp of React hooks, Context API, rendering cycles, and memoization.', 'Component design, Custom hooks, Async handling', 'Deep dive into micro-frontends and SSR concepts'),
(3, 1, 1, 1, '2026-10-10 15:30:00', 'System Design, Microservices & Docker Deployment', 1, 'SCHEDULED', NULL, NULL, NULL),
(4, 2, 1, 1, '2026-09-28 14:30:00', 'Frontend Engineering & CSS Layouts', 1, 'SCHEDULED', NULL, NULL, NULL);

-- 14. NOTIFICATIONS
INSERT INTO notifications (id, user_id, title, message, type, reference_type, reference_id, is_read) VALUES
(1, 6, 'Assignment Graded — 92/100', 'Your assignment "React Component Architecture" has been reviewed with score 92/100.', 'ASSIGNMENT', 'assignment', 2, 0),
(2, 6, 'Mock Interview Feedback Published', 'Your evaluation score for React State Management is 92%. Check your evaluation report.', 'INTERVIEW', 'mock_interview', 2, 0),
(3, 6, 'Tuition Payment Confirmed', 'Your tuition payment of ₹35,000 via UPI has been verified and posted.', 'FEE', 'invoice', 1, 1),
(4, 6, 'Mock Interview Scheduled', 'Upcoming Mock Interview on System Design is scheduled for Oct 10 at 03:30 PM.', 'INTERVIEW', 'mock_interview', 3, 0),
(5, 6, 'New Assignment Released', 'Assignment "Database Indexing & Complex SQL Queries" is due on Oct 5, 2026.', 'ASSIGNMENT', 'assignment', 3, 0);

-- 15. COUPONS
INSERT INTO coupons (code, discount_type, discount_value, valid_until, max_uses, current_uses, is_active) VALUES
('EARLYBIRD2026', 'PERCENTAGE', 10.00, '2026-12-31', 50, 3, TRUE),
('FLAT5000', 'FIXED', 5000.00, '2026-12-31', 100, 5, TRUE);

-- 16. STUDENT WALLET & COIN TRANSACTIONS
INSERT INTO student_wallet (student_id, coins_balance, total_earned, total_spent) VALUES
(1, 12500, 12500, 0),
(2, 10000, 10000, 0);

INSERT INTO coin_transactions (student_id, type, coins, balance_after, reason, reference_type) VALUES
(1, 'CREDIT', 10000, 10000, '🎁 Welcome Bonus — 10,000 coins credited on registration', 'WELCOME_BONUS'),
(1, 'CREDIT', 1500, 11500, '⭐ Top Performer Bonus — 95% on REST API Assignment', 'ASSIGNMENT_REWARD'),
(1, 'CREDIT', 1000, 12500, '🏆 Mock Interview Excellence Reward', 'INTERVIEW_REWARD'),
(2, 'CREDIT', 10000, 10000, '🎁 Welcome Bonus — 10,000 coins credited on registration', 'WELCOME_BONUS');
