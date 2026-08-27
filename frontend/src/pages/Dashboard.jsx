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
        /* Trainer Dashboard View (SRS Page 7-8) */
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <DashboardCard title="Assigned Batches" value={stats?.assigned_batches || 0} icon="bi-layers" color="primary" />
            </div>
            <div className="col-md-3">
              <DashboardCard title="Total Students" value={stats?.total_students || 0} icon="bi-mortarboard" color="success" />
            </div>
            <div className="col-md-3">
              <DashboardCard title="Pending Mocks" value={stats?.pending_mock_requests || 0} icon="bi-mic" color="warning" />
            </div>
            <div className="col-md-3">
              <DashboardCard title="Today's Classes" value={stats?.todays_classes || 0} icon="bi-calendar-event" color="info" />
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <DashboardCard title="Upcoming Mocks" value={stats?.upcoming_mock_interviews || 0} icon="bi-clock-history" color="primary" />
            </div>
            <div className="col-md-4">
              <DashboardCard title="Pending Assignments" value={stats?.pending_assignment_tracking || 0} icon="bi-journal-code" color="warning" />
            </div>
            <div className="col-md-4">
              <DashboardCard title="Delegated Mocks" value={stats?.delegated_mocks || 0} icon="bi-person-gear" color="success" />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-body p-4">
              <h6 className="fw-bold text-dark mb-3"><i className="bi bi-lightning-charge-fill text-warning me-2"></i>Trainer Quick Actions</h6>
              <div className="d-flex flex-wrap gap-2">
                <a href="/attendance" className="btn btn-sm btn-outline-primary rounded-pill px-3 py-2 fw-semibold">
                  <i className="bi bi-calendar-check me-1.5"></i>Mark Attendance
                </a>
                <a href="/mock-interviews" className="btn btn-sm btn-outline-warning text-dark rounded-pill px-3 py-2 fw-semibold">
                  <i className="bi bi-mic me-1.5"></i>Review Mock Requests
                </a>
                <a href="/assignments" className="btn btn-sm btn-outline-success rounded-pill px-3 py-2 fw-semibold">
                  <i className="bi bi-journal-plus me-1.5"></i>Create Assignment
                </a>
                <a href="/timetable" className="btn btn-sm btn-outline-info rounded-pill px-3 py-2 fw-semibold">
                  <i className="bi bi-calendar3 me-1.5"></i>View Schedule
                </a>
              </div>
            </div>
          </div>
        </>
      ) : role === 'SUPPORT_EXECUTIVE' ? (
        /* Support Executive Dashboard View (SRS Page 9) */
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-2.4 col-sm-6" style={{ flex: '1 0 18%' }}>
              <DashboardCard title="New Delegated" value={stats?.new_delegated_mocks || 0} icon="bi-inbox" color="primary" />
            </div>
            <div className="col-md-2.4 col-sm-6" style={{ flex: '1 0 18%' }}>
              <DashboardCard title="Pending Acceptance" value={stats?.pending_acceptance || 0} icon="bi-clock-history" color="warning" />
            </div>
            <div className="col-md-2.4 col-sm-6" style={{ flex: '1 0 18%' }}>
              <DashboardCard title="Today's Mocks" value={stats?.todays_mocks || 0} icon="bi-calendar-event" color="info" />
            </div>
            <div className="col-md-2.4 col-sm-6" style={{ flex: '1 0 18%' }}>
              <DashboardCard title="Upcoming Mocks" value={stats?.upcoming_mocks || 0} icon="bi-mic" color="success" />
            </div>
            <div className="col-md-2.4 col-sm-6" style={{ flex: '1 0 18%' }}>
              <DashboardCard title="Completed Mocks" value={stats?.completed_mocks || 0} icon="bi-check-circle" color="secondary" />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-body p-4">
              <h6 className="fw-bold text-dark mb-3"><i className="bi bi-lightning-charge-fill text-warning me-2"></i>Support Quick Actions</h6>
              <div className="d-flex flex-wrap gap-2">
                <a href="/mock-interviews" className="btn btn-sm btn-outline-primary rounded-pill px-3 py-2 fw-semibold">
                  <i className="bi bi-inbox me-1.5"></i>View Delegated Mocks
                </a>
                <a href="/timetable" className="btn btn-sm btn-outline-info rounded-pill px-3 py-2 fw-semibold">
                  <i className="bi bi-calendar3 me-1.5"></i>View Schedule
                </a>
              </div>
            </div>
          </div>
        </>
      ) : role === 'SALES_EXECUTIVE' ? (
        /* Sales Executive Dashboard View (SRS Page 6-7) */
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <DashboardCard title="Admission Links" value={stats?.total_admission_links || 0} icon="bi-link-45deg" color="primary" />
            </div>
            <div className="col-md-3">
              <DashboardCard title="Submitted Admissions" value={stats?.submitted_admissions || 0} icon="bi-clock-history" color="warning" />
            </div>
            <div className="col-md-3">
              <DashboardCard title="Approved Admissions" value={stats?.approved_admissions || 0} icon="bi-check-circle-fill" color="success" />
            </div>
            <div className="col-md-3">
              <DashboardCard title="Rejected Admissions" value={stats?.rejected_admissions || 0} icon="bi-x-circle-fill" color="danger" />
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <DashboardCard title="Total Students" value={stats?.total_students || 0} icon="bi-mortarboard" color="info" />
            </div>
            <div className="col-md-3">
              <DashboardCard title="Pending Instalments" value={stats?.pending_instalments || 0} icon="bi-hourglass-split" color="warning" />
            </div>
            <div className="col-md-3">
              <DashboardCard title="Overdue Instalments" value={stats?.overdue_instalments || 0} icon="bi-exclamation-triangle" color="danger" />
            </div>
            <div className="col-md-3">
              <DashboardCard title="Mock Credits Assigned" value={stats?.mock_credits_assigned || 0} icon="bi-mic" color="primary" />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-body p-4">
              <h6 className="fw-bold text-dark mb-3"><i className="bi bi-lightning-charge-fill text-warning me-2"></i>Sales Quick Actions</h6>
              <div className="d-flex flex-wrap gap-2">
                <a href="/admission-links" className="btn btn-sm btn-outline-primary rounded-pill px-3 py-2 fw-semibold">
                  <i className="bi bi-link-45deg me-1.5"></i>Generate Admission Link
                </a>
                <a href="/coupons" className="btn btn-sm btn-outline-success rounded-pill px-3 py-2 fw-semibold">
                  <i className="bi bi-ticket-perforated me-1.5"></i>Create Coupon
                </a>
                <a href="/admissions" className="btn btn-sm btn-outline-warning text-dark rounded-pill px-3 py-2 fw-semibold">
                  <i className="bi bi-file-earmark-check me-1.5"></i>View Admissions
                </a>
                <a href="/finance" className="btn btn-sm btn-outline-info rounded-pill px-3 py-2 fw-semibold">
                  <i className="bi bi-receipt me-1.5"></i>Create Invoice
                </a>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Admin Dashboard Overview (SRS Page 5 - FR-004) */
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-2.4 col-sm-6" style={{ flex: '1 0 18%' }}>
              <DashboardCard title="Total Students" value={stats?.total_students || 0} icon="bi-mortarboard" color="primary" />
            </div>
            <div className="col-md-2.4 col-sm-6" style={{ flex: '1 0 18%' }}>
              <DashboardCard title="Active Batches" value={stats?.active_batches || 0} icon="bi-layers" color="success" />
            </div>
            <div className="col-md-2.4 col-sm-6" style={{ flex: '1 0 18%' }}>
              <DashboardCard title="Pending Admissions" value={stats?.pending_admissions || 0} icon="bi-clock-history" color="warning" />
            </div>
            <div className="col-md-2.4 col-sm-6" style={{ flex: '1 0 18%' }}>
              <DashboardCard title="Overdue Invoices" value={stats?.overdue_invoices || 0} icon="bi-exclamation-triangle" color="danger" />
            </div>
            <div className="col-md-2.4 col-sm-6" style={{ flex: '1 0 18%' }}>
              <DashboardCard title="Upcoming Mocks" value={stats?.upcoming_mocks || 0} icon="bi-mic" color="info" />
            </div>
          </div>

          {/* Quick Actions (FR-004) */}
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-body p-4">
              <h6 className="fw-bold text-dark mb-3"><i className="bi bi-lightning-charge-fill text-warning me-2"></i>Quick Actions</h6>
              <div className="d-flex flex-wrap gap-2">
                <a href="/students/add" className="btn btn-sm btn-outline-primary rounded-pill px-3 py-2 fw-semibold">
                  <i className="bi bi-person-plus-fill me-1.5"></i>Add Student
                </a>
                <a href="/users" className="btn btn-sm btn-outline-success rounded-pill px-3 py-2 fw-semibold">
                  <i className="bi bi-person-badge-fill me-1.5"></i>Add Trainer
                </a>
                <a href="/users" className="btn btn-sm btn-outline-info rounded-pill px-3 py-2 fw-semibold">
                  <i className="bi bi-funnel-fill me-1.5"></i>Add Sales Executive
                </a>
                <a href="/users" className="btn btn-sm btn-outline-secondary rounded-pill px-3 py-2 fw-semibold">
                  <i className="bi bi-headset me-1.5"></i>Add Support Executive
                </a>
                <a href="/batches" className="btn btn-sm btn-outline-warning text-dark rounded-pill px-3 py-2 fw-semibold">
                  <i className="bi bi-layers-fill me-1.5"></i>Create Batch
                </a>
                <a href="/admissions" className="btn btn-sm btn-outline-dark rounded-pill px-3 py-2 fw-semibold">
                  <i className="bi bi-file-earmark-check-fill me-1.5"></i>View Admissions
                </a>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
