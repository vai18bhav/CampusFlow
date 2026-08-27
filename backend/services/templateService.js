const pool = require('../config/db');

/**
 * Compiles dynamic template variables into HTML body and subject line.
 * Supports placeholders like {{student_name}}, {{course_name}}, {{amount}}, {{currency}}, etc.
 */
const compileTemplate = async (templateCode, variables = {}) => {
  try {
    const [rows] = await pool.query(
      'SELECT subject, body_html FROM email_templates WHERE code = ? AND is_active = 1',
      [templateCode]
    );

    if (rows.length === 0) {
      // Fallback subject and body if template code not found in DB
      return {
        subject: variables.subject || 'CampusFlow Notification',
        html: `<p>${variables.message || 'You have a new notification on CampusFlow.'}</p>`
      };
    }

    let subject = rows[0].subject;
    let html = rows[0].body_html;

    // Substitute all variables provided in dictionary
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      const valStr = value !== undefined && value !== null ? String(value) : '';
      subject = subject.replace(regex, valStr);
      html = html.replace(regex, valStr);
    }

    return { subject, html };
  } catch (error) {
    console.error(`Template compilation error [${templateCode}]:`, error.message);
    return {
      subject: variables.subject || 'CampusFlow Notification',
      html: `<p>${variables.message || 'CampusFlow Notification'}</p>`
    };
  }
};

module.exports = {
  compileTemplate
};
