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
        </>
      )}
    </div>
  );
};

export default Dashboard;
