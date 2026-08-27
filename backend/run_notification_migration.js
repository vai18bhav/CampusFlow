/**
 * Database Migration Script for Email Templates & Notification System
 */

const pool = require('./config/db');

async function runNotificationMigration() {
  console.log('🔄 Running Email Templates Migration...');
  try {
    // 1. Create email_templates table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
        subject VARCHAR(255) NOT NULL,
        body_html TEXT NOT NULL,
        body_text TEXT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('  ✅ Table email_templates verified / created.');

    // 2. Default Email Templates Data
    const defaultTemplates = [
      {
        code: 'ADMISSION_SUBMITTED',
        name: 'New Admission Form Submitted',
        category: 'ADMISSION',
        subject: '🎓 New Admission Submitted — {{student_name}}',
        body_html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #2563eb;">CampusFlow — New Admission Form</h2>
          <p>A new admission form has been submitted.</p>
          <ul>
            <li><strong>Student Name:</strong> {{student_name}}</li>
            <li><strong>Email:</strong> {{student_email}}</li>
            <li><strong>Course:</strong> {{course_name}}</li>
            <li><strong>Currency:</strong> {{currency}}</li>
          </ul>
          <p><a href="{{login_link}}" style="background: #2563eb; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 6px;">Review Application</a></p>
        </div>`
      },
      {
        code: 'ADMISSION_APPROVED',
        name: 'Admission Approved',
        category: 'ADMISSION',
        subject: '🎉 Congratulations! Your CampusFlow Admission is Approved',
        body_html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #16a34a;">Admission Approved!</h2>
          <p>Dear {{student_name}},</p>
          <p>Your admission for <strong>{{course_name}}</strong> (Batch: {{batch_name}}) has been officially approved.</p>
          <p><a href="{{login_link}}" style="background: #16a34a; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 6px;">Login to Portal</a></p>
        </div>`
      },
      {
        code: 'ADMISSION_REJECTED',
        name: 'Admission Rejected',
        category: 'ADMISSION',
        subject: 'Update Regarding Your CampusFlow Admission Application',
        body_html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #dc2626;">Admission Application Update</h2>
          <p>Dear {{student_name}},</p>
          <p>Regrettably, your admission application for <strong>{{course_name}}</strong> could not be approved at this time.</p>
        </div>`
      },
      {
        code: 'COUPON_EXPIRING_3DAYS',
        name: 'Coupon Expiring in 3 Days',
        category: 'SALES',
        subject: '⚠️ Alert: Coupon Code {{coupon_code}} Expires in 3 Days',
        body_html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #ea580c;">Coupon Expiring Soon</h2>
          <p>Your sales coupon <strong>{{coupon_code}}</strong> is set to expire on {{expiry_date}}.</p>
        </div>`
      },
      {
        code: 'INSTALMENT_DUE_3DAYS',
        name: 'Instalment Due Reminder (3 Days)',
        category: 'FINANCE',
        subject: '📌 Fee Reminder: Instalment Due in 3 Days — Invoice #{{invoice_number}}',
        body_html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #2563eb;">Instalment Payment Due</h2>
          <p>Dear {{student_name}},</p>
          <p>Your upcoming fee instalment of <strong>{{currency}} {{amount}}</strong> for Invoice #{{invoice_number}} is due on <strong>{{due_date}}</strong>.</p>
        </div>`
      },
      {
        code: 'INSTALMENT_OVERDUE',
        name: 'Instalment Overdue Notice',
        category: 'FINANCE',
        subject: '🚨 URGENT: Fee Instalment Overdue — Invoice #{{invoice_number}}',
        body_html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #dc2626;">Overdue Instalment Notice</h2>
          <p>Dear {{student_name}},</p>
          <p>Your fee instalment of <strong>{{currency}} {{amount}}</strong> for Invoice #{{invoice_number}} is now past due (Due Date: {{due_date}}).</p>
        </div>`
      },
      {
        code: 'MOCK_REQUEST_SUBMITTED',
        name: 'New Mock Interview Request',
        category: 'MOCK',
        subject: '🎙️ New Mock Interview Request — {{student_name}}',
        body_html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #2563eb;">Mock Interview Requested</h2>
          <p>Student <strong>{{student_name}}</strong> has requested a mock interview session for <strong>{{mock_date}} at {{mock_time}}</strong>.</p>
        </div>`
      },
      {
        code: 'MOCK_ACCEPTED_REJECTED',
        name: 'Mock Request Status Update',
        category: 'MOCK',
        subject: '📅 Mock Interview Request Update',
        body_html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #2563eb;">Mock Session Status Update</h2>
          <p>Dear {{student_name}},</p>
          <p>Your mock interview request for {{mock_date}} with {{interviewer_name}} has been updated.</p>
        </div>`
      },
      {
        code: 'MOCK_DELEGATED_RESPONSE',
        name: 'Delegated Mock Interview Update',
        category: 'MOCK',
        subject: '🔁 Support Executive Delegation Update',
        body_html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #2563eb;">Delegated Mock Updated</h2>
          <p>Support Executive has reviewed the delegated mock interview session for student {{student_name}}.</p>
        </div>`
      },
      {
        code: 'MOCK_DUE_1HOUR',
        name: 'Mock Interview Starting in 1 Hour',
        category: 'MOCK',
        subject: '⏰ Reminder: Mock Interview Starting in 1 Hour',
        body_html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #ea580c;">Mock Session Reminder</h2>
          <p>Your scheduled mock interview with {{interviewer_name}} is starting in 1 hour (at {{mock_time}}).</p>
        </div>`
      },
      {
        code: 'MOCK_CREDITS_EXPIRING_7DAYS',
        name: 'Mock Credits Expiring in 7 Days',
        category: 'MOCK',
        subject: '⌛ Alert: Your Mock Credits Expire in 7 Days',
        body_html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #ea580c;">Mock Credits Expiry Alert</h2>
          <p>Dear {{student_name}},</p>
          <p>You have <strong>{{credit_remaining}}</strong> mock interview credits remaining, which will expire on <strong>{{expiry_date}}</strong>.</p>
        </div>`
      },
      {
        code: 'MOCK_CREDITS_EXHAUSTED',
        name: 'Mock Credits Exhausted',
        category: 'MOCK',
        subject: 'ℹ️ Notice: Mock Credits Exhausted',
        body_html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #64748b;">Mock Credits Balance Exhausted</h2>
          <p>Dear {{student_name}},</p>
          <p>You have used all assigned mock credits (0 remaining).</p>
        </div>`
      },
      {
        code: 'ASSIGNMENT_CREATED',
        name: 'New Assignment Shared',
        category: 'ASSIGNMENT',
        subject: '📚 New Assignment Published — {{assignment_title}}',
        body_html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #2563eb;">New Assignment Published</h2>
          <p>A new assignment <strong>{{assignment_title}}</strong> has been assigned to your batch (Due: {{due_date}}).</p>
        </div>`
      },
      {
        code: 'WELCOME_EMAIL',
        name: 'New User Welcome Email',
        category: 'USER',
        subject: '🎓 Welcome to CampusFlow — Account Registration',
        body_html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #2563eb;">Welcome to CampusFlow</h2>
          <p>Hello {{student_name}},</p>
          <p>Your user account has been successfully created. Role: {{role}}.</p>
          <p><a href="{{login_link}}" style="background: #2563eb; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 6px;">Login to Portal</a></p>
        </div>`
      },
      {
        code: 'PASSWORD_RESET',
        name: 'Password Reset Request',
        category: 'USER',
        subject: '🔐 Reset Your CampusFlow Password',
        body_html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #2563eb;">Password Reset Request</h2>
          <p>Hello {{student_name}},</p>
          <p>Click the link below to reset your password. This link is valid for 1 hour.</p>
          <p><a href="{{reset_link}}" style="background: #2563eb; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 6px;">Reset Password</a></p>
        </div>`
      }
    ];

    for (const t of defaultTemplates) {
      await pool.query(
        `INSERT INTO email_templates (code, name, category, subject, body_html, is_active)
         VALUES (?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE name = VALUES(name), subject = VALUES(subject), body_html = VALUES(body_html)`,
        [t.code, t.name, t.category, t.subject, t.body_html]
      );
    }
    console.log('  ✅ Default Email Templates populated.');

    console.log('🎉 Migration completed successfully.\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration Error:', err.message);
    process.exit(1);
  }
}

runNotificationMigration();
