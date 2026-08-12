const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

// Create Nodemailer Transporter for Gmail SMTP / Standard SMTP
const createTransporter = () => {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT || '587', 10);
  const user = process.env.EMAIL_USER || '';
  const pass = process.env.EMAIL_PASS || '';

  // If Gmail credentials are provided in .env, use authentic SMTP
  if (user && pass) {
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      host: host,
      port: port,
      secure: port === 465,
      auth: {
        user: user,
        pass: pass
      }
    });
  }

  // Fallback Ethereal / Simulated Logger Transporter if credentials not set
  return {
    sendMail: async (mailOptions) => {
      console.log('\n======================================================');
      console.log('📧 [GMAIL SIMULATED DISPATCH - CAMPUSFLOW NOTIFICATION]');
      console.log(`To: ${mailOptions.to}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log(`Body:\n${mailOptions.text || mailOptions.html.replace(/<[^>]*>?/gm, '')}`);
      console.log('======================================================\n');
      return { messageId: `simulated-${Date.now()}` };
    }
  };
};

const transporter = createTransporter();

/**
 * 1. Send Welcome / Student Account Registration Email
 */
const sendStudentWelcomeEmail = async ({ toEmail, studentName, rollNumber, password }) => {
  try {
    const mailOptions = {
      from: `"CampusFlow Portal" <${process.env.EMAIL_USER || 'no-reply@campusflow.com'}>`,
      to: toEmail,
      subject: '🎓 Welcome to CampusFlow — Account Registration & Access Details',
      html: `
        <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; padding: 24px; background-color: #f8fafc; color: #0f172a;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0; shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #2563eb; margin: 0; font-size: 24px; font-weight: 800;">CampusFlow Portal</h2>
              <span style="color: #64748b; font-size: 13px;">Training & Admission Management Platform</span>
            </div>
            <h3 style="color: #0f172a;">Welcome aboard, ${studentName}! 👋</h3>
            <p style="color: #475569; line-height: 1.6;">
              Your student profile has been created in CampusFlow. Below are your official enrollment and portal login credentials:
            </p>
            <div style="background-color: #f1f5f9; border-radius: 8px; padding: 18px; margin: 20px 0; border-left: 4px solid #2563eb;">
              <p style="margin: 4px 0;"><strong>Roll Number:</strong> ${rollNumber || 'STU-2026-001'}</p>
              <p style="margin: 4px 0;"><strong>Login Email:</strong> ${toEmail}</p>
              <p style="margin: 4px 0;"><strong>Initial Password:</strong> ${password || 'password123'}</p>
              <p style="margin: 4px 0;"><strong>Portal URL:</strong> <a href="http://localhost:5173/login" style="color: #2563eb;">http://localhost:5173/login</a></p>
            </div>
            <p style="color: #475569;">You can now log in to track your course attendance, assignments, tuition fees, and mock interview evaluations.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">© 2026 CampusFlow Administration. Automated Email Notification.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✓ Welcome email dispatched to Gmail: ${toEmail}`);
  } catch (error) {
    console.error('Failed to send welcome email:', error.message);
  }
};

/**
 * 2. Send New Assignment Published Email Alert
 */
const sendAssignmentEmail = async ({ toEmail, studentName, assignmentTitle, batchName, dueDate, instructions }) => {
  try {
    const mailOptions = {
      from: `"CampusFlow Academics" <${process.env.EMAIL_USER || 'no-reply@campusflow.com'}>`,
      to: toEmail,
      subject: `📚 New Assignment Uploaded: ${assignmentTitle}`,
      html: `
        <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; padding: 24px; background-color: #f8fafc; color: #0f172a;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #2563eb; margin: 0;">CampusFlow Coursework</h2>
            </div>
            <h3>Hello ${studentName},</h3>
            <p style="color: #475569;">A new practical assignment has been published for your batch <strong>${batchName || 'MERN Stack'}</strong>.</p>
            <div style="background-color: #eff6ff; border-radius: 8px; padding: 18px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <p style="margin: 4px 0;"><strong>Assignment Title:</strong> ${assignmentTitle}</p>
              <p style="margin: 4px 0;"><strong>Submission Due Date:</strong> ${dueDate}</p>
              <p style="margin: 4px 0;"><strong>Instructions:</strong> ${instructions || 'Submit solution link or PDF document via portal.'}</p>
            </div>
            <div style="text-align: center; margin-top: 24px;">
              <a href="http://localhost:5173/assignments" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">Submit Assignment Work →</a>
            </div>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✓ Assignment notification email dispatched to Gmail: ${toEmail}`);
  } catch (error) {
    console.error('Failed to send assignment email:', error.message);
  }
};

/**
 * 3. Send Payment & Fee Receipt Email
 */
const sendPaymentReceiptEmail = async ({ toEmail, studentName, amount, invoiceNumber, balanceDue, paymentMethod }) => {
  try {
    const mailOptions = {
      from: `"CampusFlow Finance" <${process.env.EMAIL_USER || 'no-reply@campusflow.com'}>`,
      to: toEmail,
      subject: `💳 Payment Receipt Confirmed — Invoice #${invoiceNumber}`,
      html: `
        <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; padding: 24px; background-color: #f8fafc; color: #0f172a;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
            <h2 style="color: #10b981; margin: 0;">Payment Received 🎉</h2>
            <p style="color: #475569; margin-top: 12px;">Dear ${studentName}, your tuition payment has been successfully recorded in your fee ledger.</p>
            <div style="background-color: #ecfdf5; border-radius: 8px; padding: 18px; margin: 20px 0; border-left: 4px solid #10b981;">
              <p style="margin: 4px 0;"><strong>Amount Received:</strong> $${amount}</p>
              <p style="margin: 4px 0;"><strong>Invoice Reference:</strong> #${invoiceNumber}</p>
              <p style="margin: 4px 0;"><strong>Payment Method:</strong> ${paymentMethod || 'UPI / Online'}</p>
              <p style="margin: 4px 0;"><strong>Remaining Balance Due:</strong> $${balanceDue}</p>
            </div>
            <p style="color: #64748b; font-size: 13px;">View your full financial transaction history anytime in your student portal under <strong>My Fees & Receipts</strong>.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✓ Payment receipt email dispatched to Gmail: ${toEmail}`);
  } catch (error) {
    console.error('Failed to send payment receipt email:', error.message);
  }
};

/**
 * 4. Send Mock Interview Schedule Email
 */
const sendMockInterviewEmail = async ({ toEmail, studentName, topic, scheduledDate, trainerName }) => {
  try {
    const mailOptions = {
      from: `"CampusFlow Placements" <${process.env.EMAIL_USER || 'no-reply@campusflow.com'}>`,
      to: toEmail,
      subject: `🎙️ Mock Interview Scheduled: ${topic}`,
      html: `
        <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; padding: 24px; background-color: #f8fafc; color: #0f172a;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
            <h2 style="color: #06b6d4; margin: 0;">Mock Interview Scheduled</h2>
            <p style="color: #475569;">Hi ${studentName}, a technical evaluation session has been booked for you.</p>
            <div style="background-color: #ecfeff; border-radius: 8px; padding: 18px; margin: 20px 0; border-left: 4px solid #06b6d4;">
              <p style="margin: 4px 0;"><strong>Topic:</strong> ${topic}</p>
              <p style="margin: 4px 0;"><strong>Evaluator Trainer:</strong> ${trainerName || 'Faculty Trainer'}</p>
              <p style="margin: 4px 0;"><strong>Scheduled Time:</strong> ${scheduledDate}</p>
            </div>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✓ Mock interview notification email dispatched to Gmail: ${toEmail}`);
  } catch (error) {
    console.error('Failed to send mock interview email:', error.message);
  }
};

/**
 * 5. Send Broadcast Notice Email
 */
const sendBroadcastNoticeEmail = async ({ toEmail, recipientName, noticeTitle, priority, content, senderName }) => {
  try {
    const priorityColor = priority === 'URGENT' ? '#ef4444' : priority === 'IMPORTANT' ? '#f59e0b' : '#2563eb';

    const mailOptions = {
      from: `"CampusFlow Notice Board" <${process.env.EMAIL_USER || 'campusflow18@gmail.com'}>`,
      to: toEmail,
      subject: `📢 [NOTICE - ${priority || 'GENERAL'}] ${noticeTitle}`,
      html: `
        <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; padding: 24px; background-color: #f8fafc; color: #0f172a;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <div style="margin-bottom: 20px;">
              <h2 style="color: #2563eb; margin: 0; font-size: 22px; font-weight: 800;">CampusFlow Official Notice</h2>
              <span style="background-color: ${priorityColor}; color: #ffffff; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; display: inline-block; margin-top: 6px;">
                ${priority || 'GENERAL'}
              </span>
            </div>
            <h3 style="color: #0f172a; margin-top: 0;">${noticeTitle}</h3>
            <p style="color: #475569;">Dear ${recipientName || 'Member'},</p>
            <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid ${priorityColor}; color: #1e293b; line-height: 1.6;">
              ${content.replace(/\n/g, '<br/>')}
            </div>
            <p style="color: #64748b; font-size: 13px;">Broadcasted by Administration: <strong>${senderName || 'Super Admin'}</strong></p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">© 2026 CampusFlow Administration. Official Broadcast System.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✓ Notice email dispatched to: ${toEmail}`);
  } catch (error) {
    console.error('Failed to send notice email:', error.message);
  }
};

module.exports = {
  sendStudentWelcomeEmail,
  sendAssignmentEmail,
  sendPaymentReceiptEmail,
  sendMockInterviewEmail,
  sendBroadcastNoticeEmail
};
