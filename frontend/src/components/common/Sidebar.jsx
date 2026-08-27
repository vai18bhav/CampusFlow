import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { normalizeRole, ROLES } from '../../utils/permissions';

const Sidebar = ({ isOpen, onClose }) => {
  const { role: rawRole, user, logout } = useAuth();
  const navigate = useNavigate();
  const role = normalizeRole(rawRole);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderNavSections = () => {
    // ── 1. STUDENT ────────────────────────────────────────────────────────
    if (role === ROLES.STUDENT) {
      return (
        <>
          <div className="cf-sidebar-section-title">STUDENT PORTAL</div>
          <NavLink to="/dashboard" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-grid-1x2"></i><span>Dashboard</span></div>
          </NavLink>
          <NavLink to="/batches" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-layers"></i><span>My Batch</span></div>
          </NavLink>
          <NavLink to="/attendance" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-calendar-check"></i><span>Attendance</span></div>
          </NavLink>
          <NavLink to="/mock-interviews" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-mic"></i><span>Mock Interviews</span></div>
          </NavLink>
          <NavLink to="/assignments" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-journal-code"></i><span>Assignments &amp; Tests</span></div>
          </NavLink>
          <NavLink to="/finance" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-receipt"></i><span>Fees &amp; Invoice</span></div>
          </NavLink>
          <NavLink to="/notices" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-bell"></i><span>Notifications</span></div>
          </NavLink>
          <NavLink to="/profile" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-person-circle"></i><span>My Profile</span></div>
          </NavLink>
        </>
      );
    }

    // ── 2. TRAINER ────────────────────────────────────────────────────────
    if (role === ROLES.TRAINER) {
      return (
        <>
          <div className="cf-sidebar-section-title">OVERVIEW</div>
          <NavLink to="/dashboard" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-grid-1x2"></i><span>Trainer Dashboard</span></div>
          </NavLink>

          <div className="cf-sidebar-section-title">ACADEMICS &amp; ADMISSIONS</div>
          <NavLink to="/batches" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-layers"></i><span>My Batches</span></div>
          </NavLink>
          <NavLink to="/admissions" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-file-earmark-check"></i><span>Pending Admissions</span></div>
          </NavLink>
          <NavLink to="/attendance" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-calendar-check"></i><span>Attendance</span></div>
          </NavLink>

          <div className="cf-sidebar-section-title">MOCKS &amp; TESTS</div>
          <NavLink to="/mock-interviews" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-mic"></i><span>Mock Interviews</span></div>
          </NavLink>
          <NavLink to="/assignments" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-journal-code"></i><span>Assignments &amp; Tests</span></div>
          </NavLink>
          <NavLink to="/test-bank" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-bank"></i><span>Test Bank</span></div>
          </NavLink>
          <NavLink to="/timetable" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-calendar3"></i><span>My Schedule</span></div>
          </NavLink>
        </>
      );
    }

    // ── 3. SALES EXECUTIVE ────────────────────────────────────────────────
    if (role === ROLES.SALES_EXECUTIVE) {
      return (
        <>
          <div className="cf-sidebar-section-title">OVERVIEW</div>
          <NavLink to="/dashboard" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-grid-1x2"></i><span>Sales Dashboard</span></div>
          </NavLink>

          <div className="cf-sidebar-section-title">ADMISSION MANAGEMENT</div>
          <NavLink to="/admission-links" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-link-45deg"></i><span>Admission Links</span></div>
          </NavLink>
          <NavLink to="/admissions" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-file-earmark-check"></i><span>Admissions</span></div>
          </NavLink>
          <NavLink to="/coupons" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-ticket-perforated"></i><span>Coupons</span></div>
          </NavLink>
          <NavLink to="/students" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-people"></i><span>Students</span></div>
          </NavLink>
          <NavLink to="/mock-interviews" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-mic"></i><span>Mock Credits</span></div>
          </NavLink>

          <div className="cf-sidebar-section-title">FINANCE & REPORTS</div>
          <NavLink to="/finance" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-receipt"></i><span>Invoices &amp; Instalments</span></div>
          </NavLink>
          <NavLink to="/reports" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-graph-up-arrow"></i><span>Reports</span></div>
          </NavLink>
        </>
      );
    }

    // ── 4. SUPPORT EXECUTIVE ──────────────────────────────────────────────
    if (role === ROLES.SUPPORT_EXECUTIVE) {
      return (
        <>
          <div className="cf-sidebar-section-title">OVERVIEW</div>
          <NavLink to="/dashboard" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-grid-1x2"></i><span>Dashboard</span></div>
          </NavLink>

          <div className="cf-sidebar-section-title">DELEGATED MOCKS</div>
          <NavLink to="/mock-interviews" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-inbox"></i><span>Delegated Mocks</span></div>
          </NavLink>
          <NavLink to="/timetable" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-calendar3"></i><span>My Schedule</span></div>
          </NavLink>
          <NavLink to="/notices" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-bell"></i><span>Notifications</span></div>
          </NavLink>
        </>
      );
    }

    // ── 5. ADMIN & SUPER ADMIN ────────────────────────────────────────────
    return (
      <>
        <div className="cf-sidebar-section-title">OVERVIEW</div>
        <NavLink to="/dashboard" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
          <div className="cf-nav-item-content"><i className="bi bi-grid-1x2"></i><span>Dashboard</span></div>
        </NavLink>
        <NavLink to="/notices" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
          <div className="cf-nav-item-content"><i className="bi bi-megaphone"></i><span>Notice Board</span></div>
        </NavLink>
        <NavLink to="/profile" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
          <div className="cf-nav-item-content"><i className="bi bi-person"></i><span>My Profile</span></div>
        </NavLink>

        <div className="cf-sidebar-section-title">MANAGEMENT</div>
        <NavLink to="/users" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
          <div className="cf-nav-item-content"><i className="bi bi-person-gear"></i><span>User Accounts</span></div>
        </NavLink>
        <NavLink to="/students" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
          <div className="cf-nav-item-content"><i className="bi bi-people"></i><span>Students</span></div>
        </NavLink>
        <NavLink to="/trainers" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
          <div className="cf-nav-item-content"><i className="bi bi-person-badge"></i><span>Trainers</span></div>
        </NavLink>

        <div className="cf-sidebar-section-title">ACADEMICS</div>
        <NavLink to="/courses" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
          <div className="cf-nav-item-content"><i className="bi bi-book"></i><span>Courses</span></div>
        </NavLink>
        <NavLink to="/batches" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
          <div className="cf-nav-item-content"><i className="bi bi-layers"></i><span>Batches</span></div>
        </NavLink>
        <NavLink to="/attendance" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
          <div className="cf-nav-item-content"><i className="bi bi-calendar-check"></i><span>Attendance</span></div>
        </NavLink>
        <NavLink to="/assignments" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
          <div className="cf-nav-item-content"><i className="bi bi-journal-code"></i><span>Assignments</span></div>
        </NavLink>

        <div className="cf-sidebar-section-title">ADMISSIONS & FINANCE</div>
        <NavLink to="/leads" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
          <div className="cf-nav-item-content"><i className="bi bi-funnel"></i><span>Leads</span></div>
        </NavLink>
        <NavLink to="/admission-links" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
          <div className="cf-nav-item-content"><i className="bi bi-link-45deg"></i><span>Admission Links</span></div>
        </NavLink>
        <NavLink to="/enrollment-requests" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
          <div className="cf-nav-item-content"><i className="bi bi-journal-check"></i><span>Enrollment Requests</span></div>
        </NavLink>
        <NavLink to="/admissions" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
          <div className="cf-nav-item-content"><i className="bi bi-file-earmark-check"></i><span>Admissions</span></div>
        </NavLink>
        <NavLink to="/finance" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
          <div className="cf-nav-item-content"><i className="bi bi-cash-coin"></i><span>Finance & Invoices</span></div>
        </NavLink>

        <div className="cf-sidebar-section-title">ASSESSMENT & BI</div>
        <NavLink to="/mock-interviews" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
          <div className="cf-nav-item-content"><i className="bi bi-mic"></i><span>Mock Interviews</span></div>
        </NavLink>
        <NavLink to="/reports" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
          <div className="cf-nav-item-content"><i className="bi bi-graph-up-arrow"></i><span>Reports & Analytics</span></div>
        </NavLink>
        <NavLink to="/timetable" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
          <div className="cf-nav-item-content"><i className="bi bi-calendar3"></i><span>Batch Timetable</span></div>
        </NavLink>

        {role === ROLES.SUPER_ADMIN && (
          <>
            <div className="cf-sidebar-section-title text-warning">SUPER ADMIN CONTROL</div>
            <NavLink to="/permission-overrides" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
              <div className="cf-nav-item-content"><i className="bi bi-key-fill text-warning"></i><span>Permission Overrides</span></div>
            </NavLink>
            <NavLink to="/settings" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
              <div className="cf-nav-item-content"><i className="bi bi-gear-wide-connected text-warning"></i><span>Platform Settings</span></div>
            </NavLink>
            <NavLink to="/audit-logs" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
              <div className="cf-nav-item-content"><i className="bi bi-shield-check text-warning"></i><span>Audit Logs</span></div>
            </NavLink>
            <NavLink to="/data-export" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
              <div className="cf-nav-item-content"><i className="bi bi-file-earmark-arrow-down text-warning"></i><span>Data Export</span></div>
            </NavLink>
            <NavLink to="/email-templates" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
              <div className="cf-nav-item-content"><i className="bi bi-envelope-paper text-warning"></i><span>Email Templates</span></div>
            </NavLink>
          </>
        )}
      </>
    );
  };

  return (
    <aside className={`cf-sidebar ${isOpen ? 'mobile-open' : ''}`}>
      {/* Brand Header */}
      <div className="cf-sidebar-brand d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2.5">
          <img src="/logo.png" alt="CampusFlow" className="brand-logo-img" onError={(e) => { e.target.style.display = 'none'; }} />
          <div className="brand-badge-cf" style={{ display: 'none' }}>CF</div>
          <div>
            <div className="brand-title">CampusFlow</div>
            <div className="brand-subtitle">Training & Admissions</div>
          </div>
        </div>
        <button className="btn btn-sm btn-link p-0 d-lg-none" style={{ color: 'var(--cf-text-muted)' }} onClick={onClose}>
          <i className="bi bi-x-lg fs-5"></i>
        </button>
      </div>

      <nav className="cf-sidebar-menu">
        {renderNavSections()}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-3 border-top mt-auto" style={{ borderColor: 'var(--cf-sidebar-border)' }}>
        <div className="d-flex align-items-center justify-content-between">
          <div className="text-truncate me-2" style={{ maxWidth: '160px' }}>
            <div className="fw-bold small text-truncate" style={{ color: 'var(--cf-text-main)' }}>{user?.full_name}</div>
            <div style={{ fontSize: '0.725rem', color: 'var(--cf-sidebar-text-muted)', fontWeight: 600 }}>{rawRole?.replace('_', ' ')}</div>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-sm btn-outline-danger border-0 rounded-circle p-2"
            title="Logout"
          >
            <i className="bi bi-box-arrow-right fs-6"></i>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
