import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import DashboardCard from '../components/common/DashboardCard';
import { useAuth } from '../context/AuthContext';

const Admissions = () => {
  const { role } = useAuth();
  const [admissions, setAdmissions] = useState([]);
  const [summary, setSummary] = useState({ total_admissions: 0, pending_admissions: 0, confirmed_admissions: 0, cancelled_admissions: 0 });
  const [studentsList, setStudentsList] = useState([]);
  const [coursesList, setCoursesList] = useState([]);
  const [batchesList, setBatchesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');

  // Modals State
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingAdmission, setEditingAdmission] = useState(null);
  const [selectedAdmissionDetails, setSelectedAdmissionDetails] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const canCreate = ['SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'].includes(role);

  // Form State
  const [formData, setFormData] = useState({
    student_id: '',
    course_id: '',
    batch_id: '',
    admission_date: new Date().toISOString().split('T')[0],
    total_fee: '',
    discount_amount: '0',
    installment_count: '2',
    status: 'CONFIRMED',
    remarks: ''
  });

  const [selectedStudentInfo, setSelectedStudentInfo] = useState(null);
  const [filteredBatchesForCourse, setFilteredBatchesForCourse] = useState([]);

  useEffect(() => {
    fetchDropdownOptions();
    fetchAdmissions();
  }, [statusFilter, courseFilter, batchFilter]);

  const fetchDropdownOptions = async () => {
    try {
      const [resS, resC, resB] = await Promise.all([
        api.get('/users/students'),
        api.get('/courses?status=active'),
        api.get('/batches')
      ]);

      if (resS.success) setStudentsList(resS.data.students);
      if (resC.success) setCoursesList(resC.data.courses);
      if (resB.success) setBatchesList(resB.data.batches);
    } catch (err) {
      console.error('Failed to load admission form dropdown options');
    }
  };

  const fetchAdmissions = async () => {
    setLoading(true);
    try {
      let queryParams = [];
      if (statusFilter) queryParams.push(`status=${encodeURIComponent(statusFilter)}`);
      if (courseFilter) queryParams.push(`course_id=${encodeURIComponent(courseFilter)}`);
      if (batchFilter) queryParams.push(`batch_id=${encodeURIComponent(batchFilter)}`);
      if (searchTerm) queryParams.push(`search=${encodeURIComponent(searchTerm)}`);

      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      const res = await api.get(`/admissions${queryString}`);
      if (res.success) {
        setAdmissions(res.data.admissions);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
    } catch (err) {
      console.error('Failed to load admissions');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAdmissions();
  };

  const handleCourseChange = (selectedCourseId) => {
    const selectedCourse = coursesList.find(c => String(c.id) === String(selectedCourseId));
    const courseFee = selectedCourse ? selectedCourse.fee_amount : '';
    
    // Filter batches belonging to selected course
    const matchingBatches = batchesList.filter(b => String(b.course_id) === String(selectedCourseId));
    setFilteredBatchesForCourse(matchingBatches);

    setFormData(prev => ({
      ...prev,
      course_id: selectedCourseId,
      batch_id: matchingBatches.length > 0 ? matchingBatches[0].id : '',
      total_fee: courseFee
    }));
  };

  const handleStudentChange = (selectedStudentId) => {
    const studentObj = studentsList.find(s => String(s.id) === String(selectedStudentId));
    setSelectedStudentInfo(studentObj || null);
    setFormData(prev => ({ ...prev, student_id: selectedStudentId }));
  };

  const handleOpenAddModal = () => {
    setEditingAdmission(null);
    setFormError('');
    setSelectedStudentInfo(null);
    const initialCourse = coursesList.length > 0 ? coursesList[0] : null;
    const initialCourseId = initialCourse ? initialCourse.id : '';
    const initialBatches = initialCourseId ? batchesList.filter(b => String(b.course_id) === String(initialCourseId)) : [];

    setFilteredBatchesForCourse(initialBatches);

    setFormData({
      student_id: studentsList.length > 0 ? studentsList[0].id : '',
      course_id: initialCourseId,
      batch_id: initialBatches.length > 0 ? initialBatches[0].id : '',
      admission_date: new Date().toISOString().split('T')[0],
      total_fee: initialCourse ? initialCourse.fee_amount : '',
      discount_amount: '0',
      installment_count: '2',
      status: 'CONFIRMED',
      remarks: ''
    });

    if (studentsList.length > 0) {
      setSelectedStudentInfo(studentsList[0]);
    }

    setShowModal(true);
  };

  const handleOpenEditModal = (adm) => {
    setEditingAdmission(adm);
    setFormError('');
    const matchingBatches = batchesList.filter(b => String(b.course_id) === String(adm.course_id));
    setFilteredBatchesForCourse(matchingBatches);

    const studentObj = studentsList.find(s => String(s.id) === String(adm.student_id));
    setSelectedStudentInfo(studentObj || null);

    setFormData({
      student_id: adm.student_id,
      course_id: adm.course_id,
      batch_id: adm.batch_id,
      admission_date: adm.admission_date ? adm.admission_date.split('T')[0] : '',
      total_fee: adm.total_fee,
      discount_amount: adm.discount_amount || '0',
      installment_count: '2',
      status: adm.status,
      remarks: adm.remarks || ''
    });
    setShowModal(true);
  };

  const handleOpenDetailsModal = async (admissionId) => {
    try {
      const res = await api.get(`/admissions/${admissionId}`);
      if (res.success) {
        setSelectedAdmissionDetails(res.data.admission);
        setShowDetailsModal(true);
      }
    } catch (err) {
      alert('Failed to load admission details');
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.student_id) return setFormError('Student selection is required.');
    if (!formData.course_id) return setFormError('Course selection is required.');
    if (!formData.batch_id) return setFormError('Batch selection is required.');

    // Capacity Validation Check
    const selectedBatch = batchesList.find(b => String(b.id) === String(formData.batch_id));
    if (selectedBatch && formData.status === 'CONFIRMED') {
      const enrolled = selectedBatch.enrolled_students_count || 0;
      const maxCap = selectedBatch.max_students || 30;
      if (enrolled >= maxCap && (!editingAdmission || String(editingAdmission.batch_id) !== String(formData.batch_id))) {
        return setFormError(`Selected batch "${selectedBatch.name}" is full (${enrolled}/${maxCap} seats filled). Please select another batch.`);
      }
    }

    setSubmitting(true);

    try {
      let res;
      if (editingAdmission) {
        res = await api.put(`/admissions/${editingAdmission.id}`, {
          batch_id: formData.batch_id,
          remarks: formData.remarks,
          status: formData.status
        });
      } else {
        res = await api.post('/admissions', formData);
      }

      if (res.success) {
        setShowModal(false);
        fetchAdmissions();
      }
    } catch (err) {
      setFormError(typeof err === 'string' ? err : 'Admission processing failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (adm) => {
    const nextStatus = adm.status === 'CONFIRMED' ? 'CANCELLED' : 'CONFIRMED';
    const confirmText = `Are you sure you want to ${nextStatus === 'CANCELLED' ? 'cancel' : 'confirm'} admission "${adm.admission_number}" for ${adm.student_name}?`;

    if (window.confirm(confirmText)) {
      try {
        const res = await api.patch(`/admissions/${adm.id}/status`, { status: nextStatus });
        if (res.success) {
          fetchAdmissions();
        }
      } catch (err) {
        alert(typeof err === 'string' ? err : 'Failed to update admission status');
      }
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-3 py-1.5 rounded-pill fw-semibold"><i className="bi bi-check-circle-fill me-1"></i> Confirmed</span>;
      case 'PENDING':
        return <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 px-3 py-1.5 rounded-pill fw-semibold"><i className="bi bi-clock-fill me-1"></i> Pending</span>;
      case 'COMPLETED':
        return <span className="badge bg-secondary bg-opacity-10 text-secondary border px-3 py-1.5 rounded-pill fw-semibold"><i className="bi bi-mortarboard-fill me-1"></i> Completed</span>;
      default:
        return <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-3 py-1.5 rounded-pill fw-semibold"><i className="bi bi-x-circle-fill me-1"></i> Cancelled</span>;
    }
  };

  const columns = [
    { header: 'Admission No.', accessor: 'admission_number', render: (r) => <span className="badge bg-secondary bg-opacity-10 text-dark border font-monospace px-2.5 py-1">{r.admission_number || `ADM-2026-000${r.id}`}</span> },
    { header: 'Student', accessor: 'student_name', render: (r) => (
        <div>
          <span className="fw-bold text-dark d-block">{r.student_name}</span>
          <span className="small text-muted font-monospace">{r.roll_number || r.student_email}</span>
        </div>
      )
    },
    { header: 'Course', accessor: 'course_name', render: (r) => <span className="fw-semibold text-dark">{r.course_name}</span> },
    { header: 'Batch Code & Timing', accessor: 'batch_code', render: (r) => (
        <div>
          <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2 py-0.5">{r.batch_code}</span>
          <div className="small text-muted mt-0.5">{r.batch_timing || 'TBD'}</div>
        </div>
      )
    },
    { header: 'Admission Date', accessor: 'admission_date', render: (r) => <span className="small font-monospace">{r.admission_date ? r.admission_date.split('T')[0] : ''}</span> },
    { header: 'Status', accessor: 'status', render: (r) => renderStatusBadge(r.status) },
    { header: 'Actions', accessor: 'id', render: (r) => (
        <div className="d-flex align-items-center gap-1.5">
          <button className="btn btn-sm btn-outline-info rounded-circle p-1.5" title="View Admission Details" onClick={() => handleOpenDetailsModal(r.id)}>
            <i className="bi bi-eye-fill"></i>
          </button>

          {canCreate && (
            <>
              <button className="btn btn-sm btn-outline-primary rounded-circle p-1.5" title="Edit Admission" onClick={() => handleOpenEditModal(r)}>
                <i className="bi bi-pencil-fill"></i>
              </button>

              <button
                className={`btn btn-sm ${r.status === 'CONFIRMED' ? 'btn-outline-danger' : 'btn-outline-success'} rounded-circle p-1.5`}
                title={r.status === 'CONFIRMED' ? 'Cancel Admission' : 'Confirm Admission'}
                onClick={() => handleToggleStatus(r)}
              >
                <i className={`bi ${r.status === 'CONFIRMED' ? 'bi-x-lg' : 'bi-check-lg'}`}></i>
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div>
      {/* Summary Metrics Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <DashboardCard title="Total Admissions" value={summary.total_admissions || 0} icon="bi-file-earmark-check" color="primary" subtitle="Enrolled admissions" />
        </div>
        <div className="col-md-3">
          <DashboardCard title="Confirmed" value={summary.confirmed_admissions || 0} icon="bi-check-circle" color="success" subtitle="Active confirmed students" />
        </div>
        <div className="col-md-3">
          <DashboardCard title="Pending" value={summary.pending_admissions || 0} icon="bi-clock-history" color="warning" subtitle="Awaiting confirmation" />
        </div>
        <div className="col-md-3">
          <DashboardCard title="Cancelled" value={summary.cancelled_admissions || 0} icon="bi-x-circle" color="danger" subtitle="Cancelled admissions" />
        </div>
      </div>

      {/* Header Banner */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1">Admission Management</h3>
          <p className="text-muted mb-0">Manage student admissions, course enrollments, and batch capacity allocations.</p>
        </div>

        {canCreate && (
          <button className="btn btn-primary rounded-pill px-3.5 shadow-sm fw-semibold" onClick={handleOpenAddModal}>
            <i className="bi bi-plus-circle-fill me-1"></i> New Admission
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="cf-card mb-4 p-3">
        <form onSubmit={handleSearchSubmit} className="row g-3 align-items-center">
          <div className="col-md-4">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted"><i className="bi bi-search"></i></span>
              <input
                type="text"
                className="form-control border-start-0 ps-0"
                placeholder="Search admission no, student name, email, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="col-md-3">
            <select className="form-select" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
              <option value="">All Courses</option>
              {coursesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="col-md-3">
            <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <div className="col-md-2 d-flex gap-2">
            <button type="submit" className="btn btn-dark rounded-pill w-100 fw-semibold">Filter</button>
            {(searchTerm || statusFilter || courseFilter || batchFilter) && (
              <button
                type="button"
                className="btn btn-outline-secondary rounded-pill"
                onClick={() => { setSearchTerm(''); setStatusFilter(''); setCourseFilter(''); setBatchFilter(''); }}
                title="Reset Filters"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Admissions Table */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : (
        <DataTable columns={columns} data={admissions} searchKey="student_name" title="Student Admission Records" />
      )}

      {/* New / Edit Admission Modal */}
      {showModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">{editingAdmission ? 'Edit Admission Record' : 'Process New Student Admission'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleFormSubmit}>
                <div className="modal-body">
                  {formError && (
                    <div className="alert alert-danger py-2 px-3 small rounded-3 mb-3">
                      <i className="bi bi-exclamation-circle-fill me-1"></i> {formError}
                    </div>
                  )}

                  {/* Student Selection */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Select Student *</label>
                    <select
                      className="form-select"
                      value={formData.student_id}
                      onChange={(e) => handleStudentChange(e.target.value)}
                      disabled={!!editingAdmission}
                      required
                    >
                      <option value="">-- Select Registered Student --</option>
                      {studentsList.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.roll_number || s.email})</option>)}
                    </select>

                    {selectedStudentInfo && (
                      <div className="p-2.5 mt-2 bg-light rounded-3 border d-flex justify-content-between align-items-center">
                        <div className="small">
                          <span className="fw-bold text-dark">{selectedStudentInfo.full_name}</span> ({selectedStudentInfo.roll_number})
                          <div className="text-muted">{selectedStudentInfo.email} | {selectedStudentInfo.phone}</div>
                        </div>
                        <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1">Active Student</span>
                      </div>
                    )}
                  </div>

                  {/* Course & Batch Selection */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Select Course *</label>
                      <select
                        className="form-select"
                        value={formData.course_id}
                        onChange={(e) => handleCourseChange(e.target.value)}
                        disabled={!!editingAdmission}
                        required
                      >
                        <option value="">-- Select Course --</option>
                        {coursesList.map(c => <option key={c.id} value={c.id}>{c.name} (${c.fee_amount})</option>)}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Select Batch *</label>
                      <select
                        className="form-select"
                        value={formData.batch_id}
                        onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                        required
                      >
                        <option value="">-- Select Batch --</option>
                        {filteredBatchesForCourse.map(b => {
                          const enrolled = b.enrolled_students_count || 0;
                          const maxCap = b.max_students || 30;
                          const isFull = enrolled >= maxCap;
                          return (
                            <option key={b.id} value={b.id} disabled={isFull && (!editingAdmission || String(editingAdmission.batch_id) !== String(b.id))}>
                              {b.name} ({b.batch_code}) — {enrolled}/{maxCap} seats {isFull ? '(FULL)' : ''}
                            </option>
                          );
                        })}
                      </select>
                      {filteredBatchesForCourse.length === 0 && (
                        <div className="text-danger small mt-1">No active batches available for selected course.</div>
                      )}
                    </div>
                  </div>

                  {/* Date, Fee & Discount */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">Admission Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.admission_date}
                        onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">Total Fee ($)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.total_fee}
                        onChange={(e) => setFormData({ ...formData, total_fee: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">Discount ($)</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={formData.discount_amount}
                        onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Status & Remarks */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Admission Status</label>
                      <select
                        className="form-select"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="CONFIRMED">CONFIRMED (Active Enrollment)</option>
                        <option value="PENDING">PENDING</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Installments Choice</label>
                      <select
                        className="form-select"
                        value={formData.installment_count}
                        onChange={(e) => setFormData({ ...formData, installment_count: e.target.value })}
                      >
                        <option value="1">1 Lump Sum Payment</option>
                        <option value="2">2 Monthly Installments</option>
                        <option value="3">3 Monthly Installments</option>
                        <option value="4">4 Quarterly Installments</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-semibold text-muted">Admission Remarks / Notes</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="Enter counseling notes, scholarship approval code, or payment mode details..."
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-light rounded-pill" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4 fw-semibold" disabled={submitting}>
                    {submitting ? 'Processing...' : editingAdmission ? 'Update Admission' : 'Confirm Admission'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Admission Details Modal */}
      {showDetailsModal && selectedAdmissionDetails && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom">
                <div className="d-flex align-items-center gap-2">
                  <h5 className="modal-title fw-bold">{selectedAdmissionDetails.admission_number || `ADM-2026-000${selectedAdmissionDetails.id}`}</h5>
                  {renderStatusBadge(selectedAdmissionDetails.status)}
                </div>
                <button type="button" className="btn-close" onClick={() => setShowDetailsModal(false)}></button>
              </div>

              <div className="modal-body p-4">
                {/* Financial Overview Card */}
                <div className="row g-3 mb-4 text-center">
                  <div className="col-4">
                    <div className="p-3 bg-light rounded-3 border">
                      <div className="small text-muted text-uppercase fw-bold">Course Tuition</div>
                      <div className="fs-5 fw-bold text-dark mt-1">${parseFloat(selectedAdmissionDetails.total_fee).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-3 bg-warning bg-opacity-10 rounded-3 border border-warning border-opacity-25">
                      <div className="small text-warning text-uppercase fw-bold">Scholarship Discount</div>
                      <div className="fs-5 fw-bold text-warning mt-1">${parseFloat(selectedAdmissionDetails.discount_amount || 0).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-3 bg-success bg-opacity-10 rounded-3 border border-success border-opacity-25">
                      <div className="small text-success text-uppercase fw-bold">Final Payable Fee</div>
                      <div className="fs-5 fw-bold text-success mt-1">${parseFloat(selectedAdmissionDetails.final_fee).toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                <div className="row g-3 mb-4">
                  {/* Student Info Card */}
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded-3 border h-100">
                      <h6 className="fw-bold text-primary mb-2"><i className="bi bi-person-circle me-2"></i>Student Details</h6>
                      <div className="fw-bold text-dark fs-6">{selectedAdmissionDetails.student_name}</div>
                      <div className="small text-muted font-monospace mb-1">Roll No: {selectedAdmissionDetails.roll_number}</div>
                      <div className="small text-muted"><i className="bi bi-envelope me-1"></i>{selectedAdmissionDetails.student_email}</div>
                      <div className="small text-muted"><i className="bi bi-telephone me-1"></i>{selectedAdmissionDetails.student_phone}</div>
                    </div>
                  </div>

                  {/* Course & Batch Card */}
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded-3 border h-100">
                      <h6 className="fw-bold text-primary mb-2"><i className="bi bi-book-half me-2"></i>Course & Batch Allocated</h6>
                      <div className="fw-bold text-dark">{selectedAdmissionDetails.course_name} ({selectedAdmissionDetails.course_code})</div>
                      <div className="small text-muted mt-1"><i className="bi bi-layers me-1"></i>Batch: <strong>{selectedAdmissionDetails.batch_name}</strong> ({selectedAdmissionDetails.batch_code})</div>
                      <div className="small text-muted"><i className="bi bi-person-badge me-1"></i>Trainer: {selectedAdmissionDetails.trainer_name || 'Unassigned'}</div>
                      <div className="small text-muted"><i className="bi bi-clock me-1"></i>Timing: {selectedAdmissionDetails.batch_timing || 'TBD'}</div>
                    </div>
                  </div>
                </div>

                {/* Generated Invoice & Remarks */}
                <div className="p-3 bg-light rounded-3 border mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="fw-bold text-dark"><i className="bi bi-receipt me-2 text-success"></i>Finance Invoice Number:</span>
                    <span className="font-monospace fw-bold text-primary">{selectedAdmissionDetails.invoice_number || 'INV-2026-PENDING'}</span>
                  </div>
                  <div className="small text-muted">
                    Invoice Status: <strong className="text-dark">{selectedAdmissionDetails.invoice_status || 'UNPAID'}</strong> | Admission Date: <strong>{selectedAdmissionDetails.admission_date ? selectedAdmissionDetails.admission_date.split('T')[0] : ''}</strong>
                  </div>
                </div>

                {selectedAdmissionDetails.remarks && (
                  <div className="p-3 bg-light rounded-3 border text-dark small">
                    <strong>Counseling Remarks:</strong> {selectedAdmissionDetails.remarks}
                  </div>
                )}
              </div>

              <div className="modal-footer border-top">
                <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowDetailsModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admissions;
