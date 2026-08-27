const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const { compileTemplate } = require('./templateService');
dotenv.config();

const createTransporter = () => {
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || '';
  const pass = process.env.SMTP_PASSWORD || process.env.EMAIL_PASS || '';

  if (user && pass) {
    return nodemailer.createTransport({
      host: host,
      port: port,
      secure: port === 465,
      auth: { user, pass }
    });
  }

  // Simulated logger fallback when credentials are not supplied
  return {
    sendMail: async (mailOptions) => {
      console.log(`\n📧 [SMTP DISPATCH SIMULATED] To: ${mailOptions.to} | Subject: ${mailOptions.subject}`);
      return { messageId: `simulated-${Date.now()}` };
    }
  };
};

const transporter = createTransporter();

/**
 * Sends email using defined template or custom HTML.
 */
const sendEmailNotification = async ({ to, templateCode, variables = {}, subject = null, html = null }) => {
  try {
    if (!to) return { success: false, error: 'No recipient email specified' };

    let finalSubject = subject;
    let finalHtml = html;

    if (templateCode) {
      const compiled = await compileTemplate(templateCode, variables);
      finalSubject = finalSubject || compiled.subject;
      finalHtml = finalHtml || compiled.html;
    }

    const fromAddress = process.env.SMTP_FROM || process.env.EMAIL_FROM || '"CampusFlow Portal" <no-reply@campusflow.com>';

    const mailOptions = {
      from: fromAddress,
      to,
      subject: finalSubject || 'CampusFlow Notification',
      html: finalHtml || '<p>CampusFlow Notification</p>',
      text: finalHtml ? finalHtml.replace(/<[^>]*>?/gm, '') : ''
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Email Delivery Failed [To: ${to}]:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmailNotification
};
