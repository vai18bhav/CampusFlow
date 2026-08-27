/**
 * permissions.js
 * Central Role-Based Access Control (RBAC) definitions and helpers for CampusFlow.
 * Based on SRS Page 3 permission matrix.
 */

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  SALES_EXECUTIVE: 'SALES_EXECUTIVE',
  TRAINER: 'TRAINER',
  SUPPORT_EXECUTIVE: 'SUPPORT_EXECUTIVE',
  STUDENT: 'STUDENT',
};

export const PERMISSIONS = {
  // User Management: Super Admin, Admin
  USER_MANAGEMENT: [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // Create Sales Executive / Trainer: Super Admin, Admin
  CREATE_STAFF: [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // Admission & Coupon Management: Super Admin, Admin, Sales Executive
  ADMISSION_MANAGEMENT: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SALES_EXECUTIVE],
  COUPON_MANAGEMENT: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SALES_EXECUTIVE],

  // Invoice & Instalment Management: Super Admin, Admin, Sales Executive
  FINANCE_MANAGEMENT: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SALES_EXECUTIVE],

  // Batch & Attendance: Super Admin, Admin, Trainer
  BATCH_MANAGEMENT: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TRAINER],
  ATTENDANCE_MARK: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TRAINER],

  // Mock Interview Scheduling: All 6 roles
  MOCK_SCHEDULE: [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.SALES_EXECUTIVE,
    ROLES.TRAINER,
    ROLES.SUPPORT_EXECUTIVE,
    ROLES.STUDENT,
  ],

  // Mock Acceptance/Rejection: Super Admin, Admin, Trainer, Support Executive
  MOCK_ACCEPT_REJECT: [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.TRAINER,
    ROLES.SUPPORT_EXECUTIVE,
  ],

  // Mock Delegation: Super Admin, Admin, Trainer
  MOCK_DELEGATE: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TRAINER],

  // Mock Feedback: Super Admin, Admin, Trainer, Support Executive
  MOCK_FEEDBACK: [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.TRAINER,
    ROLES.SUPPORT_EXECUTIVE,
  ],

  // Assignment Creation/Sharing: Super Admin, Admin, Trainer
  ASSIGNMENT_CREATE: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TRAINER],

  // View Student Progress: Super Admin, Admin, Sales Executive, Trainer; Student (own)
  VIEW_STUDENT_PROGRESS: [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.SALES_EXECUTIVE,
    ROLES.TRAINER,
  ],

  // Own Attendance & Schedule: All 6 roles
  VIEW_OWN_ATTENDANCE: [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.SALES_EXECUTIVE,
    ROLES.TRAINER,
    ROLES.SUPPORT_EXECUTIVE,
    ROLES.STUDENT,
  ],

  // Reports & Analytics: Super Admin, Admin, Sales Executive (partial)
  REPORTS_FULL: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  REPORTS_PARTIAL: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SALES_EXECUTIVE],
};

/**
 * Normalises role string (e.g. "Super Admin" -> "SUPER_ADMIN")
 */
export const normalizeRole = (roleStr) => {
  if (!roleStr) return '';
  return String(roleStr).toUpperCase().replace(/\s+/g, '_');
};

/**
 * Checks if a given role has a specific permission.
 */
export const can = (role, permission) => {
  const norm = normalizeRole(role);
  const allowed = PERMISSIONS[permission];
  return Array.isArray(allowed) && allowed.includes(norm);
};

/**
 * Checks if a role is one of the allowed roles.
 */
export const hasRole = (userRole, ...allowedRoles) => {
  const norm = normalizeRole(userRole);
  const allowedNorm = allowedRoles.map(r => normalizeRole(r));
  return allowedNorm.includes(norm);
};
