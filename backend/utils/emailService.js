const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

// Create Nodemailer Transporter for Gmail SMTP / Standard SMTP
const createTransporter = () => {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT || '587', 10);
  const user = process.env.EMAIL_USER || 'campusflow18@gmail.com';
  const pass = process.env.EMAIL_PASS || 'rzswmverqdkrlbwr';

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

/**
 * Send enrollment request decision email to student
 */
const sendEnrollmentDecisionEmail = async ({ toEmail, studentName, courseName, batchName, status, adminRemarks }) => {
  const isApproved = status === 'APPROVED';
  const transporter = createTransporter();
  const mailOptions = {
    from: `"CampusFlow Admissions" <${process.env.EMAIL_USER || 'campusflow18@gmail.com'}>`,
    to: toEmail,
    subject: isApproved
      ? `✅ Enrollment Approved — ${courseName} | CampusFlow`
      : `❌ Enrollment Update — ${courseName} | CampusFlow`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 0; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, ${isApproved ? '#10b981, #3b82f6' : '#ef4444, #f59e0b'}); padding: 2.5rem; text-align: center;">
          <div style="font-size: 3rem;">${isApproved ? '🎉' : '📋'}</div>
          <h1 style="color: white; margin: 0.5rem 0; font-size: 1.5rem;">Enrollment ${isApproved ? 'Approved!' : 'Status Update'}</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 0;">CampusFlow Training Institute</p>
        </div>
        <div style="padding: 2rem; background: white;">
          <p style="color: #374151; font-size: 1rem;">Dear <strong>${studentName}</strong>,</p>
          ${isApproved
            ? `<p style="color: #374151;">Great news! Your enrollment request has been <strong style="color: #10b981;">approved</strong>. You are now enrolled in:</p>`
            : `<p style="color: #374151;">We have reviewed your enrollment request. Unfortunately, your request for <strong>${courseName}</strong> has been <strong style="color: #ef4444;">not approved</strong> at this time.</p>`
          }
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0;">
            <div style="margin-bottom: 0.5rem;"><strong>📚 Course:</strong> ${courseName}</div>
            ${batchName ? `<div style="margin-bottom: 0.5rem;"><strong>🏫 Batch:</strong> ${batchName}</div>` : ''}
            ${adminRemarks ? `<div><strong>📝 Remarks:</strong> ${adminRemarks}</div>` : ''}
          </div>
          ${isApproved
            ? `<p style="color: #374151;">Please log in to your CampusFlow portal to access your course materials, attendance, and assignments.</p>`
            : `<p style="color: #374151;">You may contact your counselor or apply again for a future batch. We look forward to supporting your learning journey.</p>`
          }
          <div style="text-align: center; margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 0.85rem;">
            <strong>CampusFlow</strong> — Training & Admissions Management Platform
          </div>
        </div>
      </div>
    `
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log(`✓ Enrollment decision email dispatched to: ${toEmail}`);
  } catch (error) {
    console.error('Failed to send enrollment decision email:', error.message);
  }
};

/**
 * Send Batch Schedule / Timing Update Notification Email
 */
const sendBatchScheduleUpdateEmail = async ({ toEmail, studentName, batchName, dayOfWeek, subject, timing, roomNumber, notes, updatedBy }) => {
  const mailOptions = {
    from: `"CampusFlow Academic Timetable" <${process.env.EMAIL_USER || 'campusflow18@gmail.com'}>`,
    to: toEmail,
    subject: `⏰ Batch Schedule Updated: ${batchName} (${dayOfWeek || 'Weekly Timing'})`,
    html: `
      <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #f97316, #f59e0b); padding: 2rem; text-align: center; color: white;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🗓️</div>
          <h2 style="margin: 0; font-size: 1.4rem; font-weight: 800;">Timetable Schedule Update</h2>
          <p style="margin: 0.3rem 0 0; opacity: 0.9; font-size: 0.9rem;">${batchName}</p>
        </div>
        <div style="padding: 2rem; background: white;">
          <p style="color: #334155; font-size: 1rem;">Hello <strong>${studentName}</strong>,</p>
          <p style="color: #475569; line-height: 1.6;">
            Your batch schedule has been updated by <strong>${updatedBy || 'Faculty / Admin'}</strong>. Please take note of the new session timing below:
          </p>
          
          <div style="background: #fff7ed; border-left: 4px solid #f97316; border-radius: 8px; padding: 1.25rem; margin: 1.5rem 0;">
            <div style="margin-bottom: 0.5rem; color: #1e293b;"><strong>🏫 Batch:</strong> ${batchName}</div>
            ${dayOfWeek ? `<div style="margin-bottom: 0.5rem; color: #1e293b;"><strong>📅 Day:</strong> ${dayOfWeek}</div>` : ''}
            ${subject ? `<div style="margin-bottom: 0.5rem; color: #1e293b;"><strong>📖 Subject:</strong> ${subject}</div>` : ''}
            <div style="margin-bottom: 0.5rem; color: #1e293b;"><strong>⏰ New Timing:</strong> <span style="color: #ea580c; font-weight: 700;">${timing}</span></div>
            ${roomNumber ? `<div style="margin-bottom: 0.5rem; color: #1e293b;"><strong>📍 Room / Link:</strong> ${roomNumber}</div>` : ''}
            ${notes ? `<div style="color: #64748b; font-size: 0.88rem;"><strong>📝 Notes:</strong> ${notes}</div>` : ''}
          </div>

          <p style="color: #475569; font-size: 0.9rem;">
            Please join your classes according to this revised schedule. You can always view your live timetable on the CampusFlow portal.
          </p>
          
          <div style="text-align: center; margin-top: 1.8rem; padding-top: 1.2rem; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 0.8rem;">
            © 2026 CampusFlow Training Institute. Automated Timetable Alert.
          </div>
        </div>
      </div>
    `
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log(`✓ Batch schedule update email dispatched to: ${toEmail}`);
  } catch (error) {
    console.error('Failed to send schedule update email:', error.message);
  }
};

module.exports = {
  sendStudentWelcomeEmail,
  sendAssignmentEmail,
  sendPaymentReceiptEmail,
  sendMockInterviewEmail,
  sendBroadcastNoticeEmail,
  sendEnrollmentDecisionEmail,
  sendBatchScheduleUpdateEmail
};


