import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { role, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderNavSections = () => {
    if (role === 'STUDENT') {
      return (
        <>
          <div className="cf-sidebar-section-title">MY ACADEMICS</div>
          <NavLink to="/dashboard" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-grid-1x2"></i><span>My Dashboard</span></div>
          </NavLink>
          <NavLink to="/notices" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-megaphone"></i><span>Notice Board</span></div>
          </NavLink>
          <NavLink to="/profile" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-person"></i><span>My Profile</span></div>
          </NavLink>
          <NavLink to="/attendance" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-calendar-check"></i><span>My Attendance</span></div>
          </NavLink>
          <NavLink to="/assignments" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-journal-code"></i><span>My Assignments</span></div>
          </NavLink>
          <NavLink to="/finance" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-cash-coin"></i><span>My Fees & Receipts</span></div>
          </NavLink>
          <NavLink to="/mock-interviews" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-mic"></i><span>Mock Interviews</span></div>
          </NavLink>
          <NavLink to="/timetable" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-calendar3"></i><span>My Timetable</span></div>
          </NavLink>
          <NavLink to="/certificates" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-award"></i><span>My Certificate</span></div>
          </NavLink>
        </>
      );
    }

    if (role === 'TRAINER') {
      return (
        <>
          <div className="cf-sidebar-section-title">ACADEMIC OPERATIONS</div>
          <NavLink to="/dashboard" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-grid-1x2"></i><span>Dashboard</span></div>
          </NavLink>
          <NavLink to="/batches" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-layers"></i><span>Assigned Batches</span></div>
          </NavLink>
          <NavLink to="/students" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-people"></i><span>Student Roster</span></div>
          </NavLink>
          <NavLink to="/attendance" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-calendar-check"></i><span>Attendance Register</span></div>
          </NavLink>
          <NavLink to="/assignments" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-journal-code"></i><span>Assignments & Grading</span></div>
          </NavLink>
          <NavLink to="/mock-interviews" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-mic"></i><span>Mock Interviews</span></div>
          </NavLink>
          <NavLink to="/timetable" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-calendar3"></i><span>Batch Timetable</span></div>
          </NavLink>
          <NavLink to="/placements" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-briefcase"></i><span>Placement Tracker</span></div>
          </NavLink>
        </>
      );
    }

    if (role === 'SALES_EXECUTIVE') {
      return (
        <>
          <div className="cf-sidebar-section-title">ADMISSION PIPELINE</div>
          <NavLink to="/dashboard" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-grid-1x2"></i><span>Dashboard</span></div>
          </NavLink>
          <NavLink to="/leads" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-funnel"></i><span>Leads & Inquiries</span></div>
          </NavLink>
          <NavLink to="/admissions" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-file-earmark-check"></i><span>Admissions</span></div>
          </NavLink>
          <NavLink to="/students" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-people"></i><span>Enrolled Students</span></div>
          </NavLink>
          <NavLink to="/courses" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
            <div className="cf-nav-item-content"><i className="bi bi-book"></i><span>Courses Catalog</span></div>
          </NavLink>
        </>
      );
    }

    // Default / Admin / Super Admin Full Management Navigation
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

        <div className="cf-sidebar-section-title">TRAINING OUTCOMES</div>
        <NavLink to="/timetable" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
          <div className="cf-nav-item-content"><i className="bi bi-calendar3"></i><span>Batch Timetable</span></div>
        </NavLink>
        <NavLink to="/documents" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
          <div className="cf-nav-item-content"><i className="bi bi-folder2-open"></i><span>Document Manager</span></div>
        </NavLink>
        <NavLink to="/placements" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
          <div className="cf-nav-item-content"><i className="bi bi-briefcase"></i><span>Placement Tracker</span></div>
        </NavLink>
        <NavLink to="/certificates" onClick={onClose} className={({ isActive }) => `cf-nav-item ${isActive ? 'active' : ''}`}>
          <div className="cf-nav-item-content"><i className="bi bi-award"></i><span>Certificates</span></div>
        </NavLink>
      </>
    );
  };

  return (
    <aside className={`cf-sidebar ${isOpen ? 'mobile-open' : ''}`}>
      {/* Brand Header */}
      <div className="cf-sidebar-brand d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <div className="brand-badge-cf">CF</div>
          <div>
            <div className="brand-title">CampusFlow</div>
            <div className="brand-subtitle">Training & Admissions</div>
          </div>
        </div>
        <button className="btn btn-sm btn-link text-white-50 d-lg-none p-0" onClick={onClose}>
          <i className="bi bi-x-lg fs-5"></i>
        </button>
      </div>

      <nav className="cf-sidebar-menu">
        {renderNavSections()}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-3 border-top border-secondary border-opacity-25 mt-auto">
        <div className="d-flex align-items-center justify-content-between">
          <div className="text-truncate me-2" style={{ maxWidth: '160px' }}>
            <div className="fw-semibold text-white small text-truncate">{user?.full_name}</div>
            <div className="text-white-50" style={{ fontSize: '0.725rem' }}>{role?.replace('_', ' ')}</div>
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
