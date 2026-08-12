import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const toggleDarkMode = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    document.documentElement.setAttribute('data-theme', nextMode ? 'dark' : 'light');
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error('Failed to mark all notifications read');
    }
  };

  const handleMarkSingleRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (err) {
      console.error('Failed to mark notification read');
    }
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/profile')) return 'My Profile & Settings';
    if (path.includes('/dashboard')) return 'Dashboard Overview';
    if (path.includes('/students')) return 'Students Roster';
    if (path.includes('/trainers')) return 'Trainers Directory';
    if (path.includes('/courses')) return 'Courses Catalog';
    if (path.includes('/batches')) return 'Batches & Schedules';
    if (path.includes('/leads')) return 'Leads & Pipeline';
    if (path.includes('/admissions')) return 'Admissions Management';
    if (path.includes('/attendance')) return 'Attendance Register';
    if (path.includes('/assignments')) return 'Assignments & Submissions';
    if (path.includes('/finance')) return 'Finance & Invoices';
    if (path.includes('/mock-interviews')) return 'Mock Interviews';
    if (path.includes('/reports')) return 'Reports & Executive BI';
    if (path.includes('/users')) return 'User & Role Management';
    return 'CampusFlow';
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="cf-navbar">
      <div className="cf-navbar-left">
        <button className="sidebar-toggle-btn" onClick={onToggleSidebar} title="Toggle Navigation Sidebar">
          <i className="bi bi-list fs-4"></i>
        </button>
        <h4 className="page-title">{getPageTitle()}</h4>
      </div>

      <div className="d-flex align-items-center gap-3">
        {/* Notifications Icon */}
        <div className="position-relative">
          <button
            className="btn btn-link text-secondary p-1 position-relative text-decoration-none"
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
          >
            <i className={`bi bi-bell fs-5 ${unreadCount > 0 ? 'bell-bounce text-primary' : ''}`}></i>
            {unreadCount > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.65rem' }}>
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="position-absolute end-0 mt-2 bg-white rounded-3 shadow-lg p-3 border" style={{ width: '340px', zIndex: 1050 }}>
              <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                <h6 className="mb-0 fw-bold text-dark">Notifications</h6>
                <button className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold" onClick={handleMarkAllRead}>Mark all read</button>
              </div>
              <div className="overflow-auto" style={{ maxHeight: '280px' }}>
                {notifications.length === 0 ? (
                  <div className="text-center py-4 text-muted small">You're all caught up 🎉</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-2.5 mb-2 rounded border-start border-3 cursor-pointer ${n.is_read ? 'bg-light border-secondary' : 'bg-primary bg-opacity-10 border-primary'}`}
                      onClick={() => handleMarkSingleRead(n.id)}
                    >
                      <div className="fw-semibold small text-dark d-flex justify-content-between">
                        <span>{n.title}</span>
                        {!n.is_read && <span className="badge bg-primary rounded-pill p-1"></span>}
                      </div>
                      <div className="text-muted small mt-0.5" style={{ fontSize: '0.8rem' }}>{n.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dark Mode Toggle */}
        <button className="btn btn-link text-secondary p-1 text-decoration-none" onClick={toggleDarkMode} title="Toggle Theme">
          <i className={`bi ${darkMode ? 'bi-sun-fill text-warning' : 'bi-moon'} fs-5`}></i>
        </button>

        {/* User Profile Dropdown */}
        <div className="dropdown">
          <button
            className="btn btn-link p-0 d-flex align-items-center gap-2 text-decoration-none dropdown-toggle"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <div className="user-avatar-badge">
              {getInitials(user?.full_name)}
            </div>
            <span className="fw-semibold text-dark small d-none d-md-inline">
              {user?.full_name}
            </span>
          </button>
          <ul className="dropdown-menu dropdown-menu-end shadow border-0 mt-2 p-2" style={{ borderRadius: '0.85rem' }}>
            <li className="dropdown-header">
              <div className="fw-bold text-dark">{user?.full_name}</div>
              <div className="small text-muted">{user?.email}</div>
            </li>
            <li><hr className="dropdown-divider" /></li>
            <li>
              <button className="dropdown-item rounded-2 d-flex align-items-center gap-2 small py-2" onClick={() => navigate('/profile')}>
                <i className="bi bi-person me-1"></i> My Profile
              </button>
            </li>
            <li>
              <button className="dropdown-item rounded-2 d-flex align-items-center gap-2 small py-2 text-danger" onClick={logout}>
                <i className="bi bi-box-arrow-right me-1"></i> Sign Out
              </button>
            </li>
          </ul>
        </div>

        {/* Direct 1-Click Logout Button */}
        <button
          className="btn btn-sm btn-outline-danger rounded-pill px-3 ms-1 d-flex align-items-center gap-1.5 fw-semibold shadow-sm"
          onClick={logout}
          title="Logout of CampusFlow"
        >
          <i className="bi bi-box-arrow-right fs-6"></i>
          <span className="d-none d-sm-inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
