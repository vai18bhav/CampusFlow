import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import DashboardCard from '../components/common/DashboardCard';
import AnimatedCounter from '../components/common/AnimatedCounter';
import { useAuth } from '../context/AuthContext';

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mockCredits, setMockCredits] = useState(null);

  useEffect(() => {
    fetchStudentDashboard();
    // Fetch mock interview credits balance
    api.get('/mock-interviews/credits').then(r => setMockCredits(r.data?.data)).catch(() => {});
  }, []);

  const fetchStudentDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/student/dashboard');
      if (res.success) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.error('Failed to load student dashboard metrics');
      setError('Unable to load student dashboard. Please check back later.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
        <div className="mt-2 text-muted fw-semibold">Loading student dashboard...</div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="alert alert-danger p-4 rounded-4 shadow-sm">
        <i className="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
        {error || 'Student dashboard metrics unavailable'}
      </div>
    );
  }

  const { student, attendance, assignments, finance, interviews, recentActivities } = dashboardData;

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
            <span className="badge bg-warning text-dark fw-bold px-3 py-1.5 rounded-pill">
              <span className="pulse-dot pulse-dot-success me-1.5"></span> STUDENT PORTAL
            </span>
            <span className="text-white-50 small font-monospace">{student?.batch_code || 'MERN-01'}</span>
          </div>
          <h3 className="fw-extrabold text-white mb-1">Good Morning, {student?.full_name || user?.full_name} 👋</h3>
          <p className="text-white-50 mb-0" style={{ maxWidth: '600px' }}>
            Welcome back to CampusFlow! Track your cumulative attendance percentage, upcoming assignment deadlines, tuition fee ledger, and mock interview evaluation scores.
          </p>
        </div>

        <div className="d-flex gap-2 position-relative z-1">
          <button className="btn btn-outline-light rounded-pill fw-semibold px-3" onClick={() => navigate('/assignments')}>
            <i className="bi bi-file-earmark-code me-1"></i> My Assignments
          </button>
          <button className="btn btn-warning text-dark rounded-pill fw-bold px-3 shadow" onClick={() => navigate('/enroll')}>
            <i className="bi bi-journal-plus me-1"></i> Enroll Course
          </button>
        </div>
      </div>

      {/* Top 4 Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <DashboardCard
            title="Attendance"
            value={`${attendance?.percentage || 0}%`}
            icon="bi-calendar-check"
            color="success"
            subtitle={`Present: ${attendance?.present_days || 0} / Total: ${attendance?.total_days || 0} Days`}
          />
        </div>

        <div className="col-md-3">
          <DashboardCard
            title="Pending Assignments"
            value={assignments?.pending_count || 0}
            icon="bi-file-earmark-text"
            color="warning"
            subtitle="Requires submission or review"
          />
        </div>

        <div className="col-md-3">
          <DashboardCard
            title="Pending Fees"
            value={`${finance?.currency === 'USD' ? '$' : '₹'} ${parseFloat(finance?.pending_fees || 0).toLocaleString()}`}
            icon="bi-cash-coin"
            color="danger"
            subtitle={finance?.next_installment_due ? `Next due: ${finance.next_installment_due.split('T')[0]}` : 'Balance remaining'}
          />
        </div>

        <div className="col-md-3">
          <DashboardCard
            title="Mock Credits"
            value={`${mockCredits?.remaining ?? 0} Credits`}
            icon="bi-shield-check"
            color="info"
            subtitle={mockCredits?.expiry ? `Expiry: ${mockCredits.expiry.split('T')[0]}` : 'Assign credits to schedule'}
          />
        </div>
      </div>

      {/* Attendance Visual Fill Bar & Profile Card */}
      <div className="row g-3 mb-4">
        <div className="col-md-5">
          <div className="cf-card h-100 p-4">
            <div className="d-flex align-items-center gap-3 mb-3">
              <div className="avatar-circle-lg bg-primary bg-opacity-10 text-primary fs-3 fw-bold rounded-circle d-flex align-items-center justify-content-center" style={{ width: 54, height: 54 }}>
                {student?.full_name ? student.full_name.slice(0, 2).toUpperCase() : 'ST'}
              </div>
              <div>
                <h5 className="fw-bold text-dark mb-0">{student?.full_name}</h5>
                <span className="badge bg-secondary bg-opacity-10 text-dark border px-2.5 py-1 font-monospace mt-1">
                  ID: {student?.student_code || `STU-2026-${String(student?.student_id || 1).padStart(3, '0')}`}
                </span>
              </div>
            </div>

            {/* Attendance Progress Visual */}
            <div className="bg-light rounded-3 p-3 mb-3 border">
              <div className="d-flex justify-content-between align-items-center small mb-1.5">
                <span className="fw-bold text-dark"><i className="bi bi-calendar-check text-success me-1"></i>Attendance Rate</span>
                <span className="fw-extrabold text-success"><AnimatedCounter value={attendance?.percentage || 0} suffix="%" /></span>
              </div>
              <div className="progress" style={{ height: '8px', borderRadius: '4px' }}>
                <div
                  className="progress-bar bg-success progress-bar-animated-fill"
                  role="progressbar"
                  style={{ width: `${Math.min(100, attendance?.percentage || 0)}%` }}
                ></div>
              </div>
            </div>

            <div className="border-top pt-3">
              <div className="d-flex justify-content-between small mb-2">
                <span className="text-muted"><i className="bi bi-envelope me-1"></i> Email:</span>
                <strong className="text-dark">{student?.email}</strong>
              </div>
              <div className="d-flex justify-content-between small mb-2">
                <span className="text-muted"><i className="bi bi-telephone me-1"></i> Phone:</span>
                <strong className="text-dark">{student?.phone || 'N/A'}</strong>
              </div>
              <div className="d-flex justify-content-between small mb-2">
                <span className="text-muted"><i className="bi bi-journal-code me-1"></i> Course:</span>
                <strong className="text-dark">{student?.course_name || 'MERN Full Stack'}</strong>
              </div>
              <div className="d-flex justify-content-between small">
                <span className="text-muted"><i className="bi bi-people me-1"></i> Batch:</span>
                <strong className="text-dark">{student?.batch_name || 'Batch #1'} ({student?.batch_code || 'MERN-01'})</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Course & Batch Card */}
        <div className="col-md-7">
          <div className="cf-card h-100 p-4">
            <h5 className="fw-bold text-dark mb-3"><i className="bi bi-book me-2 text-primary"></i>Course & Batch Overview</h5>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="p-3 bg-light rounded-3 border">
                  <span className="small text-muted text-uppercase fw-bold">Assigned Trainer</span>
                  <div className="fw-bold text-dark fs-6 mt-1">{student?.trainer_name || 'Rahul Sir'}</div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="p-3 bg-light rounded-3 border">
                  <span className="small text-muted text-uppercase fw-bold">Batch Status</span>
                  <div className="fw-bold text-success fs-6 mt-1 d-flex align-items-center gap-1.5">
                    <span className="pulse-dot pulse-dot-success"></span> {student?.batch_status || 'ONGOING'}
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="p-3 bg-light rounded-3 border">
                  <span className="small text-muted text-uppercase fw-bold">Batch Start Date</span>
                  <div className="fw-bold text-dark fs-6 mt-1">{student?.start_date ? student.start_date.split('T')[0] : '2026-06-01'}</div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="p-3 bg-light rounded-3 border">
                  <span className="small text-muted text-uppercase fw-bold">Batch End Date</span>
                  <div className="fw-bold text-dark fs-6 mt-1">{student?.end_date ? student.end_date.split('T')[0] : '2026-09-30'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Widget Grid: Assignments & Mock Interviews */}
      <div className="row g-3 mb-4">
        {/* Assignments Widget */}
        <div className="col-md-7">
          <div className="cf-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold text-dark mb-0"><i className="bi bi-list-task text-warning me-2"></i>Upcoming & Pending Assignments</h5>
              <button className="btn btn-sm btn-link text-decoration-none fw-semibold" onClick={() => navigate('/assignments')}>View All →</button>
            </div>

            {assignments?.list?.length === 0 ? (
              <div className="text-center py-4 text-muted">No assignments assigned to your batch.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Assignment Title</th>
                      <th>Due Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments?.list?.map(a => (
                      <tr key={a.id}>
                        <td className="fw-bold text-dark">{a.title}</td>
                        <td className="small font-monospace">{a.due_date ? a.due_date.split('T')[0] : ''}</td>
                        <td>
                          <span className={`badge ${a.status === 'Reviewed' ? 'bg-success' : a.status === 'Submitted' ? 'bg-info text-dark' : a.status === 'Overdue' ? 'bg-danger' : 'bg-warning text-dark'} px-2.5 py-1 rounded-pill`}>
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Mock Interview Widget */}
        <div className="col-md-5">
          <div className="cf-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold text-dark mb-0"><i className="bi bi-camera-video text-info me-2"></i>Mock Interview Status</h5>
              <button className="btn btn-sm btn-link text-decoration-none fw-semibold" onClick={() => navigate('/mock-interviews')}>View All →</button>
            </div>

            {/* Upcoming Interview */}
            {interviews?.upcoming ? (
              <div className="p-3 bg-info bg-opacity-10 border border-info border-opacity-25 rounded-3 mb-3">
                <div className="badge bg-info text-dark fw-bold mb-2">
                  <span className="pulse-dot pulse-dot-info me-1"></span> SCHEDULED SESSION
                </div>
                <h6 className="fw-bold text-dark mb-1">{interviews.upcoming.topic}</h6>
                <div className="small text-muted">
                  <i className="bi bi-person me-1"></i> Trainer: <strong>{interviews.upcoming.trainer_name}</strong>
                </div>
                <div className="small text-muted font-monospace mt-1">
                  <i className="bi bi-clock me-1"></i> {interviews.upcoming.scheduled_date ? new Date(interviews.upcoming.scheduled_date).toLocaleString() : ''}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-light rounded-3 text-center text-muted mb-3 small">
                No upcoming mock interview scheduled.
              </div>
            )}

            {/* Latest Evaluation Score */}
            {interviews?.latest_evaluation ? (
              <div className="p-3 bg-success bg-opacity-10 border border-success border-opacity-25 rounded-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="small text-success text-uppercase fw-bold">Latest Score</span>
                  <span className="fs-5 fw-extrabold text-success">
                    <AnimatedCounter value={interviews.latest_evaluation.score} suffix=" / 100" />
                  </span>
                </div>
                <div className="small text-dark fw-semibold mb-1">{interviews.latest_evaluation.topic}</div>
                <p className="small text-muted mb-0">{interviews.latest_evaluation.feedback || 'Great technical foundation and clear verbal expression.'}</p>
              </div>
            ) : (
              <div className="p-3 bg-light rounded-3 text-center text-muted small">
                No interview evaluations available yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
