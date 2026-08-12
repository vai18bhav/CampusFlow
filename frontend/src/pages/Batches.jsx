import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import DashboardCard from '../components/common/DashboardCard';
import { useAuth } from '../context/AuthContext';

const Batches = () => {
  const { role } = useAuth();
  const [batches, setBatches] = useState([]);
  const [summary, setSummary] = useState({ total_batches: 0, active_batches: 0, upcoming_batches: 0, completed_batches: 0 });
  const [coursesList, setCoursesList] = useState([]);
  const [trainersList, setTrainersList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [trainerFilter, setTrainerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');

  // Modals State
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [selectedBatchDetails, setSelectedBatchDetails] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(role);

  // Form State
  const [formData, setFormData] = useState({
    batch_name: '',
    batch_code: '',
    course_id: '',
    trainer_id: '',
    start_date: '',
    end_date: '',
    start_time: '09:00 AM',
    end_time: '12:00 PM',
    capacity: 30,
    mode: 'OFFLINE',
    status: 'UPCOMING',
    description: ''
  });

  useEffect(() => {
    fetchInitialOptions();
    fetchBatches();
  }, [courseFilter, trainerFilter, statusFilter, modeFilter]);

  const fetchInitialOptions = async () => {
    try {
      const [resC, resT] = await Promise.all([
        api.get('/courses?status=active'),
        api.get('/users/trainers')
      ]);

      if (resC.success) setCoursesList(resC.data.courses);
      if (resT.success) setTrainersList(resT.data.trainers);
    } catch (err) {
      console.error('Failed to load course/trainer dropdown options');
    }
  };

  const fetchBatches = async () => {
    setLoading(true);
    try {
      let queryParams = [];
      if (courseFilter) queryParams.push(`course_id=${encodeURIComponent(courseFilter)}`);
      if (trainerFilter) queryParams.push(`trainer_id=${encodeURIComponent(trainerFilter)}`);
      if (statusFilter) queryParams.push(`status=${encodeURIComponent(statusFilter)}`);
      if (modeFilter) queryParams.push(`mode=${encodeURIComponent(modeFilter)}`);
      if (searchTerm) queryParams.push(`search=${encodeURIComponent(searchTerm)}`);

      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      const res = await api.get(`/batches${queryString}`);
      if (res.success) {
        setBatches(res.data.batches);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
    } catch (err) {
      console.error('Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBatches();
  };

  const handleOpenAddModal = () => {
    setEditingBatch(null);
    setFormError('');
    setFormData({
      batch_name: '',
      batch_code: '',
      course_id: coursesList.length > 0 ? coursesList[0].id : '',
      trainer_id: trainersList.length > 0 ? trainersList[0].id : '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      start_time: '09:00 AM',
      end_time: '12:00 PM',
      capacity: 30,
      mode: 'OFFLINE',
      status: 'UPCOMING',
      description: ''
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (batch) => {
    setEditingBatch(batch);
    setFormError('');
    setFormData({
      batch_name: batch.name,
      batch_code: batch.batch_code,
      course_id: batch.course_id,
      trainer_id: batch.trainer_id || '',
      start_date: batch.start_date ? batch.start_date.split('T')[0] : '',
      end_date: batch.end_date ? batch.end_date.split('T')[0] : '',
      start_time: batch.start_time || '09:00 AM',
      end_time: batch.end_time || '12:00 PM',
      capacity: batch.max_students || 30,
      mode: batch.mode || 'OFFLINE',
      status: batch.status,
      description: batch.description || ''
    });
    setShowModal(true);
  };

  const handleOpenDetailsModal = async (batchId) => {
    try {
      const res = await api.get(`/batches/${batchId}`);
      if (res.success) {
        setSelectedBatchDetails(res.data.batch);
        setShowDetailsModal(true);
      }
    } catch (err) {
      alert('Failed to load batch details');
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Validations
    if (!formData.batch_name.trim()) return setFormError('Batch Name is required.');
    if (!formData.course_id) return setFormError('Course selection is required.');
    if (!formData.start_date) return setFormError('Start Date is required.');

    if (formData.end_date && new Date(formData.end_date) < new Date(formData.start_date)) {
      return setFormError('End Date cannot be before Start Date.');
    }

    const capNum = parseInt(formData.capacity, 10);
    if (isNaN(capNum) || capNum <= 0) return setFormError('Capacity must be a positive integer.');

    // Capacity Reduction Check on Edit
    if (editingBatch && capNum < editingBatch.enrolled_students_count) {
      return setFormError(`Capacity (${capNum}) cannot be reduced below the current number of enrolled students (${editingBatch.enrolled_students_count}).`);
    }

    setSubmitting(true);

    try {
      const autoCode = formData.batch_code.trim()
        ? formData.batch_code.trim().toUpperCase()
        : `BATCH-${Date.now().toString().slice(-6)}`;

      const payload = {
        course_id: formData.course_id,
        trainer_id: formData.trainer_id || null,
        batch_code: autoCode,
        name: formData.batch_name.trim(),
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        start_time: formData.start_time,
        end_time: formData.end_time,
        timing: `${formData.start_time} - ${formData.end_time}`,
        mode: formData.mode,
        max_students: capNum,
        description: formData.description.trim(),
        status: formData.status
      };

      let res;
      if (editingBatch) {
        res = await api.put(`/batches/${editingBatch.id}`, payload);
      } else {
        res = await api.post('/batches', payload);
      }

      if (res.success) {
        setShowModal(false);
        fetchBatches();
      }
    } catch (err) {
      setFormError(typeof err === 'string' ? err : 'Batch operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (batch) => {
    const nextStatus = ['ONGOING', 'ACTIVE'].includes(batch.status) ? 'INACTIVE' : 'ONGOING';
    const confirmText = `Are you sure you want to ${nextStatus === 'INACTIVE' ? 'deactivate' : 'activate'} "${batch.name}" (${batch.batch_code})?`;

    if (window.confirm(confirmText)) {
      try {
        const res = await api.patch(`/batches/${batch.id}/status`, { status: nextStatus });
        if (res.success) {
          fetchBatches();
        }
      } catch (err) {
        alert(typeof err === 'string' ? err : 'Failed to update batch status');
      }
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'ONGOING':
      case 'ACTIVE':
        return <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-3 py-1.5 rounded-pill fw-semibold"><i className="bi bi-play-circle-fill me-1"></i> Active / Ongoing</span>;
      case 'UPCOMING':
        return <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 px-3 py-1.5 rounded-pill fw-semibold"><i className="bi bi-clock-fill me-1"></i> Upcoming</span>;
      case 'COMPLETED':
        return <span className="badge bg-secondary bg-opacity-10 text-secondary border px-3 py-1.5 rounded-pill fw-semibold"><i className="bi bi-check-circle-fill me-1"></i> Completed</span>;
      default:
        return <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-3 py-1.5 rounded-pill fw-semibold"><i className="bi bi-pause-circle-fill me-1"></i> Inactive</span>;
    }
  };

  const renderModeBadge = (mode) => {
    switch (mode) {
      case 'ONLINE':
        return <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25 px-2.5 py-1 rounded-pill"><i className="bi bi-wifi me-1"></i> Online</span>;
      case 'HYBRID':
        return <span className="badge bg-purple bg-opacity-10 text-purple border border-purple border-opacity-25 px-2.5 py-1 rounded-pill"><i className="bi bi-laptop me-1"></i> Hybrid</span>;
      default:
        return <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2.5 py-1 rounded-pill"><i className="bi bi-building me-1"></i> Offline</span>;
    }
  };

  const columns = [
    { header: 'Batch Name & Code', accessor: 'name', render: (r) => (
        <div>
          <span className="fw-bold text-dark d-block">{r.name}</span>
          <span className="badge bg-secondary bg-opacity-10 text-dark border font-monospace px-2 py-0.5 mt-0.5">{r.batch_code}</span>
        </div>
      )
    },
    { header: 'Course', accessor: 'course_name', render: (r) => <span className="fw-semibold text-dark">{r.course_name}</span> },
    { header: 'Assigned Trainer', accessor: 'trainer_name', render: (r) => r.trainer_name ? <span className="fw-medium text-dark"><i className="bi bi-person-badge text-primary me-1"></i>{r.trainer_name}</span> : <span className="text-muted small">Unassigned</span> },
    { header: 'Schedule & Timing', accessor: 'timing', render: (r) => (
        <div className="small">
          <div className="fw-semibold text-dark"><i className="bi bi-clock me-1 text-muted"></i>{r.timing || 'TBD'}</div>
          <div className="text-muted">{r.start_date ? r.start_date.split('T')[0] : ''}</div>
        </div>
      )
    },
    { header: 'Capacity', accessor: 'max_students', render: (r) => {
        const enrolled = r.enrolled_students_count || 0;
        const maxCap = r.max_students || 30;
        const percent = Math.min(100, Math.round((enrolled / maxCap) * 100));
        const isFull = enrolled >= maxCap;
        return (
          <div style={{ width: '130px' }}>
            <div className="d-flex justify-content-between small mb-1">
              <span className="fw-bold text-dark">{enrolled} / {maxCap}</span>
              <span className={`fw-semibold ${isFull ? 'text-danger' : 'text-success'}`}>{isFull ? 'Full' : `${maxCap - enrolled} left`}</span>
            </div>
            <div className="progress" style={{ height: '6px' }}>
              <div className={`progress-bar ${isFull ? 'bg-danger' : percent > 75 ? 'bg-warning' : 'bg-success'}`} style={{ width: `${percent}%` }}></div>
            </div>
          </div>
        );
      }
    },
    { header: 'Mode', accessor: 'mode', render: (r) => renderModeBadge(r.mode) },
    { header: 'Status', accessor: 'status', render: (r) => renderStatusBadge(r.status) },
    { header: 'Actions', accessor: 'id', render: (r) => (
        <div className="d-flex align-items-center gap-1.5">
          <button className="btn btn-sm btn-outline-info rounded-circle p-1.5" title="View Batch Details" onClick={() => handleOpenDetailsModal(r.id)}>
            <i className="bi bi-eye-fill"></i>
          </button>

          {isAdmin && (
            <>
              <button className="btn btn-sm btn-outline-primary rounded-circle p-1.5" title="Edit Batch" onClick={() => handleOpenEditModal(r)}>
                <i className="bi bi-pencil-fill"></i>
              </button>

              <button
                className={`btn btn-sm ${['ONGOING', 'ACTIVE'].includes(r.status) ? 'btn-outline-danger' : 'btn-outline-success'} rounded-circle p-1.5`}
                title={['ONGOING', 'ACTIVE'].includes(r.status) ? 'Deactivate Batch' : 'Activate Batch'}
                onClick={() => handleToggleStatus(r)}
              >
                <i className={`bi ${['ONGOING', 'ACTIVE'].includes(r.status) ? 'bi-lock-fill' : 'bi-unlock-fill'}`}></i>
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div>
      {/* Top Dashboard Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <DashboardCard title="Total Batches" value={summary.total_batches || 0} icon="bi-layers" color="primary" subtitle="Configured batches" />
        </div>
        <div className="col-md-3">
          <DashboardCard title="Active / Ongoing" value={summary.active_batches || 0} icon="bi-play-circle" color="success" subtitle="In session batches" />
        </div>
        <div className="col-md-3">
          <DashboardCard title="Upcoming Batches" value={summary.upcoming_batches || 0} icon="bi-clock-history" color="warning" subtitle="Scheduled for start" />
        </div>
        <div className="col-md-3">
          <DashboardCard title="Completed" value={summary.completed_batches || 0} icon="bi-check-circle" color="info" subtitle="Finished batches" />
        </div>
      </div>

      {/* Header Banner */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1">Batch Management</h3>
          <p className="text-muted mb-0">Manage training batches, schedules, trainer assignments, and student capacities.</p>
        </div>

        {isAdmin && (
          <button className="btn btn-primary rounded-pill px-3.5 shadow-sm fw-semibold" onClick={handleOpenAddModal}>
            <i className="bi bi-plus-circle-fill me-1"></i> Add Batch
          </button>
        )}
      </div>

      {/* Multi-Filter and Search Bar */}
      <div className="cf-card mb-4 p-3">
        <form onSubmit={handleSearchSubmit} className="row g-3 align-items-center">
          <div className="col-md-4">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted"><i className="bi bi-search"></i></span>
              <input
                type="text"
                className="form-control border-start-0 ps-0"
                placeholder="Search batch name, code, trainer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="col-md-2">
            <select className="form-select" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
              <option value="">All Courses</option>
              {coursesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="col-md-2">
            <select className="form-select" value={trainerFilter} onChange={(e) => setTrainerFilter(e.target.value)}>
              <option value="">All Trainers</option>
              {trainersList.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>

          <div className="col-md-2">
            <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="ONGOING">Active / Ongoing</option>
              <option value="UPCOMING">Upcoming</option>
              <option value="COMPLETED">Completed</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div className="col-md-2 d-flex gap-2">
            <button type="submit" className="btn btn-dark rounded-pill w-100 fw-semibold">Filter</button>
            {(searchTerm || courseFilter || trainerFilter || statusFilter || modeFilter) && (
              <button
                type="button"
                className="btn btn-outline-secondary rounded-pill"
                onClick={() => { setSearchTerm(''); setCourseFilter(''); setTrainerFilter(''); setStatusFilter(''); setModeFilter(''); }}
                title="Reset Filters"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Batch List Table */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : (
        <DataTable columns={columns} data={batches} searchKey="name" title="Configured Training Batches" />
      )}

      {/* Add / Edit Batch Form Modal */}
      {showModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">{editingBatch ? 'Edit Batch Information' : 'Create New Training Batch'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleFormSubmit}>
                <div className="modal-body">
                  {formError && (
                    <div className="alert alert-danger py-2 px-3 small rounded-3 mb-3">
                      <i className="bi bi-exclamation-circle-fill me-1"></i> {formError}
                    </div>
                  )}

                  <div className="row g-3 mb-3">
                    <div className="col-md-8">
                      <label className="form-label small fw-semibold text-muted">Batch Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Full Stack Web Dev Morning Batch"
                        value={formData.batch_name}
                        onChange={(e) => setFormData({ ...formData, batch_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">Batch Code</label>
                      <input
                        type="text"
                        className="form-control font-monospace text-uppercase"
                        placeholder="e.g. MERN-2026-01"
                        value={formData.batch_code}
                        onChange={(e) => setFormData({ ...formData, batch_code: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Course *</label>
                      <select
                        className="form-select"
                        value={formData.course_id}
                        onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                        required
                      >
                        <option value="">-- Select Course --</option>
                        {coursesList.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Assign Trainer</label>
                      <select
                        className="form-select"
                        value={formData.trainer_id}
                        onChange={(e) => setFormData({ ...formData, trainer_id: e.target.value })}
                      >
                        <option value="">-- Unassigned --</option>
                        {trainersList.map(t => <option key={t.id} value={t.id}>{t.full_name} ({t.specialization || 'Faculty'})</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Start Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">End Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">Start Time</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="10:00 AM"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">End Time</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="12:00 PM"
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">Max Capacity *</label>
                      <input
                        type="number"
                        min="1"
                        className="form-control"
                        placeholder="30"
                        value={formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Delivery Mode</label>
                      <select
                        className="form-select"
                        value={formData.mode}
                        onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                      >
                        <option value="OFFLINE">Offline (In-Person)</option>
                        <option value="ONLINE">Online (Virtual)</option>
                        <option value="HYBRID">Hybrid</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Batch Status</label>
                      <select
                        className="form-select"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="UPCOMING">UPCOMING</option>
                        <option value="ONGOING">ONGOING / ACTIVE</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="INACTIVE">INACTIVE</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-semibold text-muted">Batch Notes & Schedule Description</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Enter classroom details, prerequisites, or session schedule notes..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-light rounded-pill" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4 fw-semibold" disabled={submitting}>
                    {submitting ? 'Saving...' : editingBatch ? 'Update Batch' : 'Create Batch'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Batch Details Modal */}
      {showDetailsModal && selectedBatchDetails && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom">
                <div className="d-flex align-items-center gap-2">
                  <h5 className="modal-title fw-bold">{selectedBatchDetails.name}</h5>
                  <span className="badge bg-secondary bg-opacity-10 text-dark border font-monospace px-2.5 py-1">{selectedBatchDetails.batch_code}</span>
                </div>
                <button type="button" className="btn-close" onClick={() => setShowDetailsModal(false)}></button>
              </div>

              <div className="modal-body p-4">
                <div className="row g-3 mb-4 text-center">
                  <div className="col-4">
                    <div className="p-3 bg-light rounded-3 border">
                      <div className="small text-muted text-uppercase fw-bold">Max Capacity</div>
                      <div className="fs-4 fw-bold text-dark mt-1">{selectedBatchDetails.max_students}</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-3 bg-primary bg-opacity-10 rounded-3 border border-primary border-opacity-25">
                      <div className="small text-primary text-uppercase fw-bold">Enrolled Students</div>
                      <div className="fs-4 fw-bold text-primary mt-1">{selectedBatchDetails.enrolled_students_count || 0}</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-3 bg-success bg-opacity-10 rounded-3 border border-success border-opacity-25">
                      <div className="small text-success text-uppercase fw-bold">Available Seats</div>
                      <div className="fs-4 fw-bold text-success mt-1">{selectedBatchDetails.available_seats}</div>
                    </div>
                  </div>
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded-3 border">
                      <div className="small text-muted">Course:</div>
                      <div className="fw-semibold text-dark">{selectedBatchDetails.course_name} ({selectedBatchDetails.course_code})</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded-3 border">
                      <div className="small text-muted">Assigned Trainer:</div>
                      <div className="fw-semibold text-dark">{selectedBatchDetails.trainer_name || 'Unassigned'}</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded-3 border">
                      <div className="small text-muted">Session Timings:</div>
                      <div className="fw-semibold text-dark">{selectedBatchDetails.timing || 'TBD'}</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded-3 border">
                      <div className="small text-muted">Mode & Status:</div>
                      <div className="d-flex align-items-center gap-2 mt-1">
                        {renderModeBadge(selectedBatchDetails.mode)}
                        {renderStatusBadge(selectedBatchDetails.status)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enrolled Students Roster */}
                <div className="mb-3">
                  <h6 className="fw-bold text-dark mb-2"><i className="bi bi-people-fill text-primary me-2"></i>Enrolled Students Roster</h6>
                  {selectedBatchDetails.students?.length > 0 ? (
                    <div className="table-responsive border rounded-3 overflow-hidden">
                      <table className="table table-hover table-sm mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Roll Number</th>
                            <th>Student Name</th>
                            <th>Email</th>
                            <th>Enrolled Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedBatchDetails.students.map(s => (
                            <tr key={s.student_id}>
                              <td className="font-monospace small fw-semibold">{s.roll_number}</td>
                              <td className="fw-bold text-dark">{s.full_name}</td>
                              <td className="small text-muted">{s.email}</td>
                              <td className="small">{s.enrolled_at ? s.enrolled_at.split('T')[0] : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-3 text-center text-muted bg-light rounded-3 small">No students enrolled in this batch yet.</div>
                  )}
                </div>
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

export default Batches;
