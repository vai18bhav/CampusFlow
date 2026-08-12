import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DashboardCard from '../components/common/DashboardCard';
import { useAuth } from '../context/AuthContext';

const Reports = () => {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Report Data States
  const [summary, setSummary] = useState(null);
  const [students, setStudents] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [finance, setFinance] = useState(null);
  const [payments, setPayments] = useState([]);
  const [interviews, setInterviews] = useState(null);
  const [users, setUsers] = useState([]);
  const [charts, setCharts] = useState(null);

  // Dropdown Options
  const [coursesList, setCoursesList] = useState([]);
  const [batchesList, setBatchesList] = useState([]);

  // Filter Form State
  const [quickDate, setQuickDate] = useState('this_month');
  const [courseFilter, setCourseFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchOptions();
    fetchReportsData();
  }, [activeTab, quickDate, courseFilter, batchFilter]);

  const fetchOptions = async () => {
    try {
      const [resC, resB] = await Promise.all([
        api.get('/courses?status=active'),
        api.get('/batches')
      ]);
      if (resC.success) setCoursesList(resC.data.courses || []);
      if (resB.success) setBatchesList(resB.data.batches || []);
    } catch (err) {
      console.error('Failed to load filter dropdowns');
    }
  };

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      let queryParams = [];
      if (quickDate) queryParams.push(`quick_date=${quickDate}`);
      if (courseFilter) queryParams.push(`course_id=${courseFilter}`);
      if (batchFilter) queryParams.push(`batch_id=${batchFilter}`);
      if (searchQuery) queryParams.push(`search=${encodeURIComponent(searchQuery)}`);

      const qStr = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

      if (activeTab === 'overview') {
        const [resSum, resCharts] = await Promise.all([
          api.get(`/reports/summary${qStr}`),
          api.get('/reports/charts')
        ]);
        if (resSum.success) setSummary(resSum.data.summary);
        if (resCharts.success) setCharts(resCharts.data);
      } else if (activeTab === 'students') {
        const res = await api.get(`/reports/students${qStr}`);
        if (res.success) setStudents(res.data.students);
      } else if (activeTab === 'admissions') {
        const res = await api.get(`/reports/admissions${qStr}`);
        if (res.success) setAdmissions(res.data.admissions || []);
      } else if (activeTab === 'courses') {
        const [resC, resB] = await Promise.all([
          api.get('/reports/courses'),
          api.get('/reports/batches')
        ]);
        if (resC.success) setCourses(resC.data.courses);
        if (resB.success) setBatches(resB.data.batches);
      } else if (activeTab === 'attendance') {
        const res = await api.get(`/reports/attendance${qStr}`);
        if (res.success) setAttendance(res.data.summary);
      } else if (activeTab === 'finance') {
        const [resF, resP] = await Promise.all([
          api.get('/reports/finance'),
          api.get(`/reports/payments${qStr}`)
        ]);
        if (resF.success) setFinance(resF.data);
        if (resP.success) setPayments(resP.data.payments);
      } else if (activeTab === 'interviews') {
        const res = await api.get('/reports/interviews');
        if (res.success) setInterviews(res.data);
      } else if (activeTab === 'users') {
        const res = await api.get('/reports/users');
        if (res.success) setUsers(res.data.roles);
      }
    } catch (err) {
      console.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (filename, rows) => {
    if (!rows || rows.length === 0) return alert('No records available to export');

    const headers = Object.keys(rows[0]).join(',');
    const csvContent = [
      headers,
      ...rows.map(r => Object.values(r).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (role === 'STUDENT') {
    return (
      <div className="alert alert-warning p-4 rounded-4 shadow-sm">
        <i className="bi bi-shield-lock-fill me-2 fs-5"></i>
        Access Restricted: Global executive reports are reserved for administrative personnel. Please view your personal performance on the Student Dashboard.
      </div>
    );
  }

  return (
    <div>
      {/* Header Banner */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h3 className="fw-extrabold mb-1">Reports & Executive Analytics</h3>
          <p className="text-muted mb-0">Real-time data reporting across students, admissions, courses, attendance, finance, and mock interviews.</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary rounded-pill px-3 fw-semibold" onClick={handlePrint}>
            <i className="bi bi-printer me-1"></i> Print Report
          </button>
          <button
            className="btn btn-success rounded-pill px-3 fw-semibold"
            onClick={() => {
              if (activeTab === 'students') exportToCSV('Students_Report', students);
              else if (activeTab === 'admissions') exportToCSV('Admissions_Report', admissions);
              else if (activeTab === 'finance') exportToCSV('Payments_Report', payments);
              else exportToCSV(`CampusFlow_${activeTab}_Report`, summary ? [summary] : []);
            }}
          >
            <i className="bi bi-file-earmark-spreadsheet me-1"></i> Export Filtered CSV
          </button>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="cf-card mb-4 p-3">
        <div className="row g-3 align-items-center">
          <div className="col-md-3">
            <label className="form-label small fw-semibold text-muted mb-1">Date Quick Filter</label>
            <select className="form-select form-select-sm" value={quickDate} onChange={(e) => setQuickDate(e.target.value)}>
              <option value="today">Today</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_year">This Year</option>
              <option value="">All Time</option>
            </select>
          </div>

          <div className="col-md-3">
            <label className="form-label small fw-semibold text-muted mb-1">Filter Course</label>
            <select className="form-select form-select-sm" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
              <option value="">All Courses</option>
              {coursesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="col-md-3">
            <label className="form-label small fw-semibold text-muted mb-1">Filter Batch</label>
            <select className="form-select form-select-sm" value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}>
              <option value="">All Batches</option>
              {batchesList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="col-md-3 d-flex align-items-end gap-2">
            <button className="btn btn-sm btn-dark rounded-pill w-100 fw-semibold" onClick={fetchReportsData}>Apply Filters</button>
            {(courseFilter || batchFilter || searchQuery) && (
              <button
                className="btn btn-sm btn-outline-secondary rounded-pill"
                onClick={() => { setCourseFilter(''); setBatchFilter(''); setSearchQuery(''); }}
                title="Reset Filters"
              >
                <i className="bi bi-arrow-counterclockwise"></i>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <ul className="nav nav-pills gap-2 mb-4 border-bottom pb-3">
        <li className="nav-item">
          <button className={`nav-link rounded-pill fw-semibold ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            <i className="bi bi-grid-fill me-1"></i> Executive Summary
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link rounded-pill fw-semibold ${activeTab === 'students' ? 'active' : ''}`} onClick={() => setActiveTab('students')}>
            <i className="bi bi-mortarboard-fill me-1"></i> Students
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link rounded-pill fw-semibold ${activeTab === 'admissions' ? 'active' : ''}`} onClick={() => setActiveTab('admissions')}>
            <i className="bi bi-file-earmark-check-fill me-1"></i> Admissions
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link rounded-pill fw-semibold ${activeTab === 'courses' ? 'active' : ''}`} onClick={() => setActiveTab('courses')}>
            <i className="bi bi-book-fill me-1"></i> Courses & Batches
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link rounded-pill fw-semibold ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>
            <i className="bi bi-calendar-check-fill me-1"></i> Attendance
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link rounded-pill fw-semibold ${activeTab === 'finance' ? 'active' : ''}`} onClick={() => setActiveTab('finance')}>
            <i className="bi bi-credit-card-fill me-1"></i> Finance & Payments
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link rounded-pill fw-semibold ${activeTab === 'interviews' ? 'active' : ''}`} onClick={() => setActiveTab('interviews')}>
            <i className="bi bi-mic-fill me-1"></i> Mock Interviews
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link rounded-pill fw-semibold ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <i className="bi bi-people-fill me-1"></i> System Users
          </button>
        </li>
      </ul>

      {/* Tab Content Areas */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : (
        <>
          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {activeTab === 'overview' && (
            <div>
              {/* Summary Cards */}
              <div className="row g-3 mb-4">
                <div className="col-md-3">
                  <DashboardCard title="Total Students" value={summary?.total_students || 0} icon="bi-mortarboard" color="primary" subtitle={`Active: ${summary?.active_students || 0}`} />
                </div>
                <div className="col-md-3">
                  <DashboardCard title="Confirmed Admissions" value={summary?.total_admissions || 0} icon="bi-file-earmark-check" color="success" subtitle={`Active Batches: ${summary?.active_batches || 0}`} />
                </div>
                <div className="col-md-3">
                  <DashboardCard title="Total Collected Revenue" value={`$${parseFloat(summary?.total_collected || 0).toLocaleString()}`} icon="bi-currency-dollar" color="success" subtitle={`Billed: $${parseFloat(summary?.total_revenue || 0).toLocaleString()}`} />
                </div>
                <div className="col-md-3">
                  <DashboardCard title="Average Attendance Rate" value={`${summary?.average_attendance || 0}%`} icon="bi-calendar-check" color="info" subtitle={`Pending Dues: $${parseFloat(summary?.pending_fees || 0).toLocaleString()}`} />
                </div>
              </div>

              {/* Charts Analytics Breakdown */}
              <div className="row g-4 mb-4">
                <div className="col-md-6">
                  <div className="cf-card h-100 p-4">
                    <h5 className="fw-bold text-dark mb-3"><i className="bi bi-graph-up text-primary me-2"></i>Monthly Revenue Collection Trend</h5>
                    {charts?.revenue_trend?.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                          <thead className="table-light">
                            <tr><th>Month</th><th className="text-end">Collected Revenue</th></tr>
                          </thead>
                          <tbody>
                            {charts.revenue_trend.map((r, idx) => (
                              <tr key={idx}>
                                <td className="fw-bold">{r.month}</td>
                                <td className="text-end fw-extrabold text-success">${parseFloat(r.monthly_collected).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : <div className="text-center py-4 text-muted">No monthly revenue data available.</div>}
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="cf-card h-100 p-4">
                    <h5 className="fw-bold text-dark mb-3"><i className="bi bi-pie-chart text-info me-2"></i>Payment Methods Distribution</h5>
                    {charts?.payment_methods?.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                          <thead className="table-light">
                            <tr><th>Method</th><th className="text-end">Total Collected</th></tr>
                          </thead>
                          <tbody>
                            {charts.payment_methods.map((pm, idx) => (
                              <tr key={idx}>
                                <td className="fw-bold"><span className="badge bg-info bg-opacity-10 text-info border px-2.5 py-1">{pm.payment_method}</span></td>
                                <td className="text-end fw-bold text-dark">${parseFloat(pm.total_amount).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : <div className="text-center py-4 text-muted">No payment transactions recorded yet.</div>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STUDENTS REPORT */}
          {activeTab === 'students' && (
            <div className="cf-card p-0 overflow-hidden">
              <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
                <h5 className="fw-bold mb-0"><i className="bi bi-mortarboard me-2 text-primary"></i>Student Roster Report ({students.length} Records)</h5>
                <input type="text" className="form-control form-control-sm w-auto" placeholder="Search student..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>ID</th>
                      <th>Student Name</th>
                      <th>Email</th>
                      <th>Course & Batch</th>
                      <th>Attendance %</th>
                      <th>Pending Dues</th>
                      <th>Interview Score</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.length === 0 ? (
                      <tr><td colSpan="8" className="text-center py-4 text-muted">No student records found matching filters.</td></tr>
                    ) : (
                      students.map(st => (
                        <tr key={st.student_id}>
                          <td className="font-monospace small"><span className="badge bg-secondary bg-opacity-10 text-dark border">{st.student_code || `STU-${st.student_id}`}</span></td>
                          <td className="fw-bold text-dark">{st.student_name}</td>
                          <td className="small text-muted">{st.student_email}</td>
                          <td>
                            <div className="fw-semibold small">{st.course_name || 'N/A'}</div>
                            <span className="small text-muted font-monospace">{st.batch_code}</span>
                          </td>
                          <td className="fw-bold text-success">{st.attendance_percentage}%</td>
                          <td className={`fw-bold ${parseFloat(st.pending_fees) > 0 ? 'text-danger' : 'text-success'}`}>${parseFloat(st.pending_fees).toLocaleString()}</td>
                          <td className="fw-bold text-info">{st.interview_score}</td>
                          <td><span className="badge bg-success bg-opacity-10 text-success border px-2.5 py-1 rounded-pill">{st.student_status || 'ACTIVE'}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ADMISSIONS REPORT */}
          {activeTab === 'admissions' && (
            <div className="cf-card p-0 overflow-hidden">
              <div className="p-3 border-bottom"><h5 className="fw-bold mb-0"><i className="bi bi-file-earmark-check me-2 text-success"></i>Admission Pipeline Report</h5></div>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Admission #</th>
                      <th>Student</th>
                      <th>Course</th>
                      <th>Batch</th>
                      <th>Admission Date</th>
                      <th>Status</th>
                      <th>Payment Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admissions.length === 0 ? (
                      <tr><td colSpan="7" className="text-center py-4 text-muted">No admission records found.</td></tr>
                    ) : (
                      admissions.map(adm => (
                        <tr key={adm.id}>
                          <td className="fw-bold font-monospace"><span className="badge bg-primary bg-opacity-10 text-primary border">{adm.admission_number}</span></td>
                          <td className="fw-semibold">{adm.student_name}</td>
                          <td>{adm.course_name}</td>
                          <td className="font-monospace small">{adm.batch_code}</td>
                          <td className="small font-monospace">{adm.admission_date ? adm.admission_date.split('T')[0] : ''}</td>
                          <td><span className="badge bg-success bg-opacity-10 text-success border px-2.5 py-1 rounded-pill">{adm.status}</span></td>
                          <td><span className="badge bg-info bg-opacity-10 text-info border px-2.5 py-1">{adm.payment_status || 'UNPAID'}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: COURSES & BATCHES */}
          {activeTab === 'courses' && (
            <div>
              <div className="cf-card p-0 overflow-hidden mb-4">
                <div className="p-3 border-bottom"><h5 className="fw-bold mb-0"><i className="bi bi-book me-2 text-primary"></i>Course Performance Ledger</h5></div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Code</th>
                        <th>Course Name</th>
                        <th>Enrolled Students</th>
                        <th>Billed Total</th>
                        <th>Collected Total</th>
                        <th>Avg Attendance</th>
                        <th>Avg Interview Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map(c => (
                        <tr key={c.id}>
                          <td className="font-monospace fw-bold">{c.code}</td>
                          <td className="fw-bold text-dark">{c.name}</td>
                          <td className="fw-bold text-primary">{c.total_students}</td>
                          <td className="fw-bold text-dark">${parseFloat(c.total_billed).toLocaleString()}</td>
                          <td className="fw-bold text-success">${parseFloat(c.total_collected).toLocaleString()}</td>
                          <td className="fw-bold text-info">{c.avg_attendance}%</td>
                          <td className="fw-bold text-secondary">{c.avg_interview_score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ATTENDANCE */}
          {activeTab === 'attendance' && attendance && (
            <div className="row g-3">
              <div className="col-md-4">
                <div className="cf-card text-center p-4">
                  <h6 className="text-muted text-uppercase fw-bold small">Overall Average Attendance</h6>
                  <h1 className="fw-extrabold text-success display-4 my-2">{attendance.avg_attendance}%</h1>
                  <span className="badge bg-success bg-opacity-10 text-success border px-3 py-1 rounded-pill">Total Logged Days: {attendance.total_logs}</span>
                </div>
              </div>

              <div className="col-md-8">
                <div className="cf-card p-4">
                  <h5 className="fw-bold mb-3"><i className="bi bi-bar-chart me-2 text-primary"></i>Attendance Counts Breakdown</h5>
                  <div className="row g-3 text-center">
                    <div className="col-3"><div className="p-3 bg-success bg-opacity-10 rounded-3 border border-success"><div className="small text-success fw-bold">PRESENT</div><div className="fs-4 fw-bold text-success">{attendance.present_count}</div></div></div>
                    <div className="col-3"><div className="p-3 bg-warning bg-opacity-10 rounded-3 border border-warning"><div className="small text-warning fw-bold">LATE</div><div className="fs-4 fw-bold text-warning">{attendance.late_count}</div></div></div>
                    <div className="col-3"><div className="p-3 bg-danger bg-opacity-10 rounded-3 border border-danger"><div className="small text-danger fw-bold">ABSENT</div><div className="fs-4 fw-bold text-danger">{attendance.absent_count}</div></div></div>
                    <div className="col-3"><div className="p-3 bg-info bg-opacity-10 rounded-3 border border-info"><div className="small text-info fw-bold">LEAVE</div><div className="fs-4 fw-bold text-info">{attendance.leave_count}</div></div></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: FINANCE & PAYMENTS */}
          {activeTab === 'finance' && finance && (
            <div>
              <div className="row g-3 mb-4">
                <div className="col-md-3"><DashboardCard title="Billed Total" value={`$${parseFloat(finance.summary.total_billed).toLocaleString()}`} icon="bi-currency-dollar" color="primary" /></div>
                <div className="col-md-3"><DashboardCard title="Collected Total" value={`$${parseFloat(finance.summary.total_collected).toLocaleString()}`} icon="bi-check-circle" color="success" /></div>
                <div className="col-md-3"><DashboardCard title="Pending Dues" value={`$${parseFloat(finance.summary.total_pending).toLocaleString()}`} icon="bi-clock-history" color="warning" /></div>
                <div className="col-md-3"><DashboardCard title="Overdue Dues" value={`$${parseFloat(finance.summary.overdue_amount).toLocaleString()}`} icon="bi-exclamation-triangle" color="danger" /></div>
              </div>

              <div className="cf-card p-0 overflow-hidden">
                <div className="p-3 border-bottom"><h5 className="fw-bold mb-0"><i className="bi bg-receipt me-2 text-success"></i>Auditable Payments Register</h5></div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr><th>Date</th><th>Invoice #</th><th>Student</th><th>Amount Paid</th><th>Method</th><th>Reference</th></tr>
                    </thead>
                    <tbody>
                      {payments.map(p => (
                        <tr key={p.id}>
                          <td className="small font-monospace">{p.payment_date ? p.payment_date.split('T')[0] : ''}</td>
                          <td className="fw-bold font-monospace">{p.invoice_number}</td>
                          <td className="fw-semibold">{p.student_name}</td>
                          <td className="fw-bold text-success">${parseFloat(p.amount).toLocaleString()}</td>
                          <td><span className="badge bg-info bg-opacity-10 text-info border px-2.5 py-1">{p.payment_method}</span></td>
                          <td className="small font-monospace">{p.transaction_reference || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: MOCK INTERVIEWS */}
          {activeTab === 'interviews' && interviews && (
            <div className="cf-card p-0 overflow-hidden">
              <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
                <h5 className="fw-bold mb-0"><i className="bi bi-mic me-2 text-info"></i>Mock Interviews & Evaluation Report</h5>
                <span className="badge bg-info bg-opacity-10 text-info border px-3 py-1.5 fw-bold fs-6">Avg Score: {interviews.summary.avg_score} / 100</span>
              </div>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr><th>Topic</th><th>Student</th><th>Trainer</th><th>Scheduled Date</th><th>Score</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {interviews.interviews?.map(mi => (
                      <tr key={mi.id}>
                        <td className="fw-bold text-dark">{mi.topic}</td>
                        <td className="fw-semibold">{mi.student_name}</td>
                        <td className="small text-muted">{mi.trainer_name}</td>
                        <td className="small font-monospace">{mi.scheduled_date ? mi.scheduled_date.replace('T', ' ') : ''}</td>
                        <td className="fw-extrabold text-info">{mi.score ? `${mi.score}/100` : 'N/A'}</td>
                        <td><span className={`badge ${mi.status === 'COMPLETED' ? 'bg-success' : 'bg-info'} px-2.5 py-1 rounded-pill`}>{mi.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: SYSTEM USERS */}
          {activeTab === 'users' && (
            <div className="cf-card p-0 overflow-hidden">
              <div className="p-3 border-bottom"><h5 className="fw-bold mb-0"><i className="bi bi-people me-2 text-dark"></i>System Users & Role Accounts Distribution</h5></div>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr><th>Role Name</th><th className="text-center">Total Accounts</th><th className="text-center">Active</th><th className="text-center">Inactive</th></tr>
                  </thead>
                  <tbody>
                    {users.map((u, idx) => (
                      <tr key={idx}>
                        <td className="fw-bold text-dark">{u.role_name}</td>
                        <td className="text-center fw-bold text-primary">{u.total_users || 0}</td>
                        <td className="text-center fw-bold text-success">{u.active_users || 0}</td>
                        <td className="text-center fw-bold text-danger">{u.inactive_users || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Reports;
