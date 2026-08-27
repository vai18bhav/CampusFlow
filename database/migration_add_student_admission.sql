-- ============================================================
-- CampusFlow Migration: Add Student / Admission Workflow
-- Compatible with MySQL 8.0+
-- ============================================================

USE campusflow_db;

-- -------------------------------------------------------
-- 1. Add currency & min_order_value to coupons table
--    (done via stored procedure for safe re-run)
-- -------------------------------------------------------
DROP PROCEDURE IF EXISTS cf_migrate_coupons;
DELIMITER $$
CREATE PROCEDURE cf_migrate_coupons()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = 'campusflow_db' AND TABLE_NAME = 'coupons' AND COLUMN_NAME = 'currency'
    ) THEN
        ALTER TABLE coupons ADD COLUMN currency VARCHAR(10) DEFAULT 'ANY' AFTER valid_until;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = 'campusflow_db' AND TABLE_NAME = 'coupons' AND COLUMN_NAME = 'min_order_value'
    ) THEN
        ALTER TABLE coupons ADD COLUMN min_order_value DECIMAL(10,2) DEFAULT 0.00 AFTER currency;
    END IF;
END$$
DELIMITER ;
CALL cf_migrate_coupons();
DROP PROCEDURE IF EXISTS cf_migrate_coupons;

-- -------------------------------------------------------
-- 2. Add mock credit fields to students table
-- -------------------------------------------------------
DROP PROCEDURE IF EXISTS cf_migrate_students;
DELIMITER $$
CREATE PROCEDURE cf_migrate_students()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = 'campusflow_db' AND TABLE_NAME = 'students' AND COLUMN_NAME = 'mock_interview_credits'
    ) THEN
        ALTER TABLE students ADD COLUMN mock_interview_credits INT DEFAULT 0 AFTER address;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = 'campusflow_db' AND TABLE_NAME = 'students' AND COLUMN_NAME = 'mock_credit_expiry'
    ) THEN
        ALTER TABLE students ADD COLUMN mock_credit_expiry DATE DEFAULT NULL AFTER mock_interview_credits;
    END IF;
END$$
DELIMITER ;
CALL cf_migrate_students();
DROP PROCEDURE IF EXISTS cf_migrate_students;

-- -------------------------------------------------------
-- 3. Create admission_links table (Sales Exec flow)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS admission_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(120) NOT NULL UNIQUE,
    sales_exec_id INT,
    course_id INT,
    currency ENUM('INR', 'USD', 'ANY') DEFAULT 'ANY',
    status ENUM('ACTIVE', 'EXPIRED', 'USED') DEFAULT 'ACTIVE',
    expires_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sales_exec_id) REFERENCES sales_executives(id) ON DELETE SET NULL,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------
-- 4. Extend admissions.status enum
-- -------------------------------------------------------
ALTER TABLE admissions
  MODIFY COLUMN status ENUM(
    'PENDING','CONFIRMED','CANCELLED','COMPLETED',
    'SENT','OPENED','IN_PROGRESS','SUBMITTED','APPROVED','REJECTED'
  ) DEFAULT 'PENDING';

-- -------------------------------------------------------
-- 5. Add new columns to admissions table
-- -------------------------------------------------------
DROP PROCEDURE IF EXISTS cf_migrate_admissions;
DELIMITER $$
CREATE PROCEDURE cf_migrate_admissions()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = 'campusflow_db' AND TABLE_NAME = 'admissions' AND COLUMN_NAME = 'admission_link_id'
    ) THEN
        ALTER TABLE admissions ADD COLUMN admission_link_id INT DEFAULT NULL AFTER lead_id;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = 'campusflow_db' AND TABLE_NAME = 'admissions' AND COLUMN_NAME = 'currency'
    ) THEN
        ALTER TABLE admissions ADD COLUMN currency ENUM('INR','USD','ANY') DEFAULT 'ANY' AFTER status;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = 'campusflow_db' AND TABLE_NAME = 'admissions' AND COLUMN_NAME = 'coupon_code'
    ) THEN
        ALTER TABLE admissions ADD COLUMN coupon_code VARCHAR(50) DEFAULT NULL AFTER currency;
    END IF;
END$$
DELIMITER ;
CALL cf_migrate_admissions();
DROP PROCEDURE IF EXISTS cf_migrate_admissions;

-- -------------------------------------------------------
-- 6. Add FK for admission_link_id (safe re-run)
-- -------------------------------------------------------
DROP PROCEDURE IF EXISTS cf_add_fk_if_not_exists;
DELIMITER $$
CREATE PROCEDURE cf_add_fk_if_not_exists()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = 'campusflow_db'
          AND TABLE_NAME = 'admissions'
          AND CONSTRAINT_NAME = 'fk_admission_link'
    ) THEN
        ALTER TABLE admissions
          ADD CONSTRAINT fk_admission_link
          FOREIGN KEY (admission_link_id) REFERENCES admission_links(id) ON DELETE SET NULL;
    END IF;
END$$
DELIMITER ;
CALL cf_add_fk_if_not_exists();
DROP PROCEDURE IF EXISTS cf_add_fk_if_not_exists;

-- -------------------------------------------------------
-- 7. Add invoices.course_id FK if missing
-- -------------------------------------------------------
DROP PROCEDURE IF EXISTS cf_add_invoice_courseid;
DELIMITER $$
CREATE PROCEDURE cf_add_invoice_courseid()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = 'campusflow_db' AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'course_id'
    ) THEN
        ALTER TABLE invoices ADD COLUMN course_id INT DEFAULT NULL AFTER student_id;
    END IF;
    -- Add invoice_date column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = 'campusflow_db' AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'invoice_date'
    ) THEN
        ALTER TABLE invoices ADD COLUMN invoice_date DATE DEFAULT NULL AFTER paid_amount;
    END IF;
    -- Add net_amount column if missing (some schemas use net_amount, some use due_amount)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = 'campusflow_db' AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'net_amount'
    ) THEN
        ALTER TABLE invoices ADD COLUMN net_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER tax_amount;
    END IF;
END$$
DELIMITER ;
CALL cf_add_invoice_courseid();
DROP PROCEDURE IF EXISTS cf_add_invoice_courseid;

SELECT 'CampusFlow migration completed successfully.' AS migration_status;
