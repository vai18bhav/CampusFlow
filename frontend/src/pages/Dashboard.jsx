import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DashboardCard from '../components/common/DashboardCard';
import StudentDashboard from './StudentDashboard';

const Dashboard = () => {
  const { user, role } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role !== 'STUDENT') {
      fetchDashboardStats();
    } else {
      setLoading(false);
    }
  }, [role]);

  const fetchDashboardStats = async () => {
    try {
      const res = await api.get('/reports/dashboard-stats');
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  if (role === 'STUDENT') {
    return <StudentDashboard />;
  }

  return (
    <div className="cf-page-enter">
      {/* Animated Hero Welcome Header Banner */}
      <div className="cf-hero-welcome d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div className="cf-hero-welcome-shapes">
          <div className="cf-shape-dot cf-shape-dot-1"></div>
          <div className="cf-shape-dot cf-shape-dot-2"></div>
        </div>
        <div className="position-relative z-1">
          <div className="d-flex align-items-center gap-2 mb-2">
            <span className="badge bg-primary bg-opacity-20 text-white border border-primary border-opacity-25 px-3 py-1 rounded-pill">
              <span className="pulse-dot pulse-dot-success me-1.5"></span> {role?.replace('_', ' ')} DASHBOARD
            </span>
          </div>
          <h3 className="fw-extrabold text-white mb-1">Welcome back, {user?.full_name}! 👋</h3>
          <p className="text-white-50 mb-0" style={{ maxWidth: '600px' }}>
            Here is your real-time operational overview for today. Monitor student enrollments, course analytics, attendance registers, and financial fee collections.
          </p>
        </div>

        <div className="d-flex gap-2 position-relative z-1">
          <button className="btn btn-outline-light rounded-pill fw-semibold px-3" onClick={fetchDashboardStats}>
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh Metrics
          </button>
        </div>
      </div>

      {role === 'TRAINER' ? (
        /* Trainer Dashboard View */
        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <DashboardCard title="Assigned Batches" value={stats?.assigned_batches || 0} icon="bi-layers" color="primary" />
          </div>
          <div className="col-md-3">
            <DashboardCard title="Active Students" value={stats?.total_students || 0} icon="bi-people" color="success" />
          </div>
          <div className="col-md-3">
            <DashboardCard title="Pending Evaluations" value={stats?.pending_evaluations || 0} icon="bi-journal-check" color="warning" />
          </div>
          <div className="col-md-3">
            <DashboardCard title="Scheduled Interviews" value={stats?.scheduled_interviews || 0} icon="bi-mic" color="info" />
          </div>
        </div>
      ) : role === 'SALES_EXECUTIVE' ? (
        /* Sales Executive Dashboard View */
        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <DashboardCard title="Total Leads" value={stats?.total_leads || 0} icon="bi-funnel" color="primary" />
          </div>
          <div className="col-md-3">
            <DashboardCard title="Converted Admissions" value={stats?.converted_leads || 0} icon="bi-person-check" color="success" />
          </div>
          <div className="col-md-3">
            <DashboardCard title="In Progress Leads" value={stats?.in_progress_leads || 0} icon="bi-clock-history" color="warning" />
          </div>
          <div className="col-md-3">
            <DashboardCard title="Conversion Ratio" value={`${stats?.conversion_rate || 0}%`} icon="bi-graph-up" color="info" />
          </div>
        </div>
      ) : (
        /* Admin & Super Admin Dashboard Overview */
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <DashboardCard title="Total Students" value={stats?.total_students || 0} icon="bi-mortarboard" color="primary" />
            </div>
            <div className="col-md-3">
              <DashboardCard title="Total Trainers" value={stats?.total_trainers || 0} icon="bi-person-badge" color="info" />
            </div>
            <div className="col-md-3">
              <DashboardCard title="Active Courses" value={stats?.active_courses || 0} icon="bi-book" color="success" />
            </div>
            <div className="col-md-3">
              <DashboardCard title="Active Batches" value={stats?.active_batches || 0} icon="bi-layers" color="warning" />
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <DashboardCard title="Total Leads" value={stats?.total_leads || 0} icon="bi-funnel" color="primary" />
            </div>
            <div className="col-md-3">
              <DashboardCard title="Total Admissions" value={stats?.total_admissions || 0} icon="bi-file-earmark-check" color="success" />
            </div>
            <div className="col-md-3">
              <DashboardCard title="Collected Revenue" value={`$${stats?.collected_revenue || 0}`} icon="bi-cash-stack" color="success" />
            </div>
            <div className="col-md-3">
              <DashboardCard title="Pending Fees" value={`$${stats?.pending_fees || 0}`} icon="bi-exclamation-circle" color="danger" />
            </div>
          </div>

          {/* Visual Analytics & Distribution Charts */}
          <div className="row g-3 mb-4">
            <div className="col-md-8">
              <div className="cf-card h-100 p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h5 className="fw-bold mb-1">📊 Monthly Admissions & Tuition Collections</h5>
                    <p className="text-muted small mb-0">Financial revenue generated over quarterly academic terms</p>
                  </div>
                  <span className="badge bg-success bg-opacity-15 text-success border border-success border-opacity-25 px-3 py-1 rounded-pill">
                    +24% Growth
                  </span>
                </div>

                <div style={{ height: '220px', display: 'flex', alignItems: 'flex-end', gap: '1.25rem', padding: '1rem 0' }}>
                  {[
                    { month: 'Apr', rev: 3200, adm: 8, height: '45%' },
                    { month: 'May', rev: 4100, adm: 12, height: '60%' },
                    { month: 'Jun', rev: 4800, adm: 15, height: '70%' },
                    { month: 'Jul', rev: 5900, adm: 19, height: '85%' },
                    { month: 'Aug', rev: 6400, adm: 22, height: '95%' },
                    { month: 'Current', rev: stats?.collected_revenue || 3800, adm: stats?.total_admissions || 6, height: '75%', active: true }
                  ].map((bar, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                      <div className="small fw-bold mb-1" style={{ fontSize: '0.72rem', color: bar.active ? '#f97316' : 'var(--cf-text-muted)' }}>
                        ${bar.rev}
                      </div>
                      <div
                        style={{
                          width: '100%',
                          maxWidth: '42px',
                          height: bar.height,
                          borderRadius: '8px 8px 0 0',
                          background: bar.active
                            ? 'linear-gradient(180deg, #f97316, #f59e0b)'
                            : 'linear-gradient(180deg, #3b82f6, #60a5fa)',
                          boxShadow: bar.active ? '0 4px 12px rgba(249, 115, 22, 0.4)' : 'none',
                          transition: 'height 0.4s ease'
                        }}
                      ></div>
                      <div className="small fw-semibold mt-2" style={{ fontSize: '0.75rem', color: 'var(--cf-text-main)' }}>
                        {bar.month}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="cf-card h-100 p-4">
                <h5 className="fw-bold mb-1">🎯 Academic Health</h5>
                <p className="text-muted small mb-3">Student enrollment distribution & batch capacity</p>

                <div className="d-flex flex-column gap-3 mt-3">
                  <div>
                    <div className="d-flex justify-content-between small fw-bold mb-1">
                      <span>Full Stack Web Dev (MERN)</span>
                      <span className="text-primary">85% Filled</span>
                    </div>
                    <div className="progress" style={{ height: '8px', borderRadius: '4px' }}>
                      <div className="progress-bar bg-primary" style={{ width: '85%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="d-flex justify-content-between small fw-bold mb-1">
                      <span>Cloud DevOps Engineering</span>
                      <span className="text-warning">68% Filled</span>
                    </div>
                    <div className="progress" style={{ height: '8px', borderRadius: '4px' }}>
                      <div className="progress-bar bg-warning" style={{ width: '68%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="d-flex justify-content-between small fw-bold mb-1">
                      <span>Data Science & Python ML</span>
                      <span className="text-success">92% Filled</span>
                    </div>
                    <div className="progress" style={{ height: '8px', borderRadius: '4px' }}>
                      <div className="progress-bar bg-success" style={{ width: '92%' }}></div>
                    </div>
                  </div>

                  <div className="p-3 bg-light rounded-3 mt-2 border">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="small text-muted fw-semibold">🪙 Total Welcome Coins Issued:</span>
                      <strong className="text-warning fs-6">40,000 🪙</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
