import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const statusBadge = (status) => {
  const map = {
    ACTIVE: 'bg-success', INACTIVE: 'bg-secondary', SUSPENDED: 'bg-danger',
    CONFIRMED: 'bg-primary', APPROVED: 'bg-success', PENDING: 'bg-warning text-dark',
    SUBMITTED: 'bg-info text-dark', REJECTED: 'bg-danger', CANCELLED: 'bg-secondary',
    UNPAID: 'bg-danger', PARTIALLY_PAID: 'bg-warning text-dark', PAID: 'bg-success', OVERDUE: 'bg-danger'
  };
  return `badge ${map[status] || 'bg-secondary'}`;
};

const Students = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [admissionFilter, setAdmissionFilter] = useState('');
  const [outstandingFilter, setOutstandingFilter] = useState('');
  const [minMockCredits, setMinMockCredits] = useState('');

  // Batches for filter dropdown
  const [batches, setBatches] = useState([]);

  // Status update modal
  const [statusModal, setStatusModal] = useState({ open: false, student: null, newStatus: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const canCreate = ['SUPER_ADMIN', 'ADMIN'].includes(role);
  const canDelete = role === 'SUPER_ADMIN';

  useEffect(() => {
    api.get('/batches').then(r => { if (r.success) setBatches(r.data.batches || []); }).catch(() => {});
  }, []);

  const fetchStudents = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', 20);
      if (search) params.set('search', search);
      if (batchFilter) params.set('batch_id', batchFilter);
      if (admissionFilter) params.set('admission_status', admissionFilter);
      if (outstandingFilter) params.set('outstanding_invoice', outstandingFilter);
      if (minMockCredits) params.set('min_mock_credits', minMockCredits);

      const res = await api.get(`/students?${params.toString()}`);
      if (res.success) {
        setStudents(res.data.students || []);
        setPagination(res.data.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to fetch students', err);
    } finally {
      setLoading(false);
    }
  }, [search, batchFilter, admissionFilter, outstandingFilter, minMockCredits]);

  useEffect(() => { fetchStudents(1); }, [fetchStudents]);

  const handleStatusChange = async () => {
    if (!statusModal.student || !statusModal.newStatus) return;
    setActionLoading(true);
    try {
      await api.patch(`/students/${statusModal.student.student_id}/status`, { status: statusModal.newStatus });
      setStatusModal({ open: false, student: null, newStatus: '' });
      fetchStudents(pagination.page);
    } catch (err) {
      alert(typeof err === 'string' ? err : 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (student) => {
    if (!window.confirm(`Permanently delete student "${student.full_name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/students/${student.student_id}`);
      fetchStudents(pagination.page);
    } catch (err) {
      alert(typeof err === 'string' ? err : 'Failed to delete student');
    }
  };

  const handleSearch = (e) => { e.preventDefault(); fetchStudents(1); };

  const clearFilters = () => {
    setSearch(''); setBatchFilter(''); setAdmissionFilter('');
    setOutstandingFilter(''); setMinMockCredits('');
  };

  const hasFilters = search || batchFilter || admissionFilter || outstandingFilter || minMockCredits;

  return (
    <div className="cf-page-enter">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1"><i className="bi bi-people-fill text-primary me-2"></i>Students Directory</h3>
          <p className="text-muted mb-0">Manage enrolled students, admissions, invoices, and mock credits.</p>
        </div>
        {canCreate && (
          <button className="btn btn-primary rounded-pill px-4 fw-semibold shadow-sm" onClick={() => navigate('/students/add')}>
            <i className="bi bi-person-plus-fill me-2"></i>Add Student
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body p-3">
          <form onSubmit={handleSearch} className="row g-2 align-items-end">
            <div className="col-md-3">
              <label className="form-label small fw-semibold mb-1">Search</label>
              <input type="text" className="form-control form-control-sm" placeholder="Name, email, phone, roll no..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-semibold mb-1">Batch</label>
              <select className="form-select form-select-sm" value={batchFilter} onChange={e => setBatchFilter(e.target.value)}>
                <option value="">All Batches</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-semibold mb-1">Admission Status</label>
              <select className="form-select form-select-sm" value={admissionFilter} onChange={e => setAdmissionFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="APPROVED">Approved</option>
                <option value="PENDING">Pending</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-semibold mb-1">Invoice</label>
              <select className="form-select form-select-sm" value={outstandingFilter} onChange={e => setOutstandingFilter(e.target.value)}>
                <option value="">All</option>
                <option value="true">Outstanding</option>
              </select>
            </div>
            <div className="col-md-1">
              <label className="form-label small fw-semibold mb-1">Min Credits</label>
              <input type="number" className="form-control form-control-sm" min="0" placeholder="0" value={minMockCredits} onChange={e => setMinMockCredits(e.target.value)} />
            </div>
            <div className="col-md-2 d-flex gap-2">
              <button type="submit" className="btn btn-primary btn-sm rounded-pill px-3 flex-grow-1">
                <i className="bi bi-search me-1"></i>Search
              </button>
              {hasFilters && (
                <button type="button" className="btn btn-outline-secondary btn-sm rounded-pill" onClick={clearFilters} title="Clear filters">
                  <i className="bi bi-x-lg"></i>
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-header bg-transparent border-bottom py-3 d-flex align-items-center justify-content-between">
          <span className="fw-semibold small">
            {loading ? 'Loading...' : `${pagination.total} student${pagination.total !== 1 ? 's' : ''} found`}
          </span>
          {pagination.totalPages > 1 && (
            <span className="text-muted small">Page {pagination.page} of {pagination.totalPages}</span>
          )}
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
          ) : students.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-people fs-1 opacity-25 d-block mb-2"></i>
              No students found. {canCreate && <span className="text-primary" style={{ cursor: 'pointer' }} onClick={() => navigate('/students/add')}>Add the first student →</span>}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 small">
                <thead className="table-light">
                  <tr>
                    <th>Student</th>
                    <th>Contact</th>
                    <th>Course / Batch</th>
                    <th>Trainer</th>
                    <th>Admission</th>
                    <th>Invoice</th>
                    <th className="text-center">Mock Credits</th>
                    <th>Account</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.student_id}>
                      <td>
                        <div className="fw-bold">{s.full_name}</div>
                        <span className="text-muted font-monospace" style={{ fontSize: 11 }}>{s.roll_number}</span>
                      </td>
                      <td>
                        <div style={{ fontSize: 12 }}>{s.email}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>{s.phone}</div>
                      </td>
                      <td>
                        {s.course_name ? (
                          <>
                            <div className="fw-semibold" style={{ fontSize: 12 }}>{s.course_name}</div>
                            <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25" style={{ fontSize: 10 }}>
                              {s.batch_code || s.batch_name}
                            </span>
                          </>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td><span className="text-muted" style={{ fontSize: 12 }}>{s.trainer_name || '—'}</span></td>
                      <td>
                        {s.admission_status ? (
                          <span className={statusBadge(s.admission_status)} style={{ fontSize: 10 }}>{s.admission_status}</span>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td>
                        {s.invoice_status ? (
                          <>
                            <span className={statusBadge(s.invoice_status)} style={{ fontSize: 10 }}>{s.invoice_status}</span>
                            {s.due_amount > 0 && (
                              <div className="text-danger" style={{ fontSize: 11 }}>Due: ₹{parseFloat(s.due_amount).toLocaleString()}</div>
                            )}
                          </>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td className="text-center">
                        <span className={`badge ${s.mock_interview_credits > 0 ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                          {s.mock_interview_credits || 0}
                        </span>
                      </td>
                      <td>
                        <span className={statusBadge(s.account_status)} style={{ fontSize: 10 }}>{s.account_status}</span>
                      </td>
                      <td>
                        <div className="d-flex gap-1 flex-wrap">
                          <button className="btn btn-sm btn-outline-secondary rounded" title="View Details" onClick={() => navigate(`/students/${s.student_id}`)}>
                            <i className="bi bi-eye"></i>
                          </button>
                          {['SUPER_ADMIN', 'ADMIN'].includes(role) && (
                            <button className="btn btn-sm btn-outline-primary rounded" title="Edit Student" onClick={() => navigate(`/students/${s.student_id}/edit`)}>
                              <i className="bi bi-pencil"></i>
                            </button>
                          )}
                          {['SUPER_ADMIN', 'ADMIN'].includes(role) && (
                            <button
                              className={`btn btn-sm rounded ${s.account_status === 'ACTIVE' ? 'btn-outline-warning' : 'btn-outline-success'}`}
                              title={s.account_status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                              onClick={() => setStatusModal({ open: true, student: s, newStatus: s.account_status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
                            >
                              <i className={`bi ${s.account_status === 'ACTIVE' ? 'bi-person-dash' : 'bi-person-check'}`}></i>
                            </button>
                          )}
                          {s.admission_id && (
                            <button className="btn btn-sm btn-outline-info rounded" title="View Admission" onClick={() => navigate(`/admissions?search=${s.roll_number}`)}>
                              <i className="bi bi-file-earmark-person"></i>
                            </button>
                          )}
                          {s.invoice_id && (
                            <button className="btn btn-sm btn-outline-dark rounded" title="View Invoice" onClick={() => navigate(`/finance?search=${s.roll_number}`)}>
                              <i className="bi bi-receipt"></i>
                            </button>
                          )}
                          {canDelete && (
                            <button className="btn btn-sm btn-outline-danger rounded" title="Delete Student" onClick={() => handleDelete(s)}>
                              <i className="bi bi-trash"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="card-footer bg-transparent border-top py-2 d-flex justify-content-center gap-2">
            <button className="btn btn-sm btn-outline-secondary rounded-pill px-3" disabled={pagination.page <= 1} onClick={() => fetchStudents(pagination.page - 1)}>
              <i className="bi bi-chevron-left"></i> Prev
            </button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const pg = Math.max(1, pagination.page - 2) + i;
              if (pg > pagination.totalPages) return null;
              return (
                <button key={pg} className={`btn btn-sm rounded-pill px-3 ${pg === pagination.page ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => fetchStudents(pg)}>{pg}</button>
              );
            })}
            <button className="btn btn-sm btn-outline-secondary rounded-pill px-3" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchStudents(pagination.page + 1)}>
              Next <i className="bi bi-chevron-right"></i>
            </button>
          </div>
        )}
      </div>

      {/* Status Change Modal */}
      {statusModal.open && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom">
                <h6 className="modal-title fw-bold">
                  {statusModal.newStatus === 'ACTIVE' ? '✅ Activate' : '⚠️ Deactivate'} Student
                </h6>
                <button type="button" className="btn-close" onClick={() => setStatusModal({ open: false, student: null, newStatus: '' })}></button>
              </div>
              <div className="modal-body small">
                Are you sure you want to <strong>{statusModal.newStatus === 'ACTIVE' ? 'activate' : 'deactivate'}</strong> student account for <strong>{statusModal.student?.full_name}</strong>?
              </div>
              <div className="modal-footer border-top gap-2">
                <button className="btn btn-sm btn-light rounded-pill" onClick={() => setStatusModal({ open: false, student: null, newStatus: '' })}>Cancel</button>
                <button className={`btn btn-sm ${statusModal.newStatus === 'ACTIVE' ? 'btn-success' : 'btn-warning'} rounded-pill px-3`} onClick={handleStatusChange} disabled={actionLoading}>
                  {actionLoading ? <span className="spinner-border spinner-border-sm"></span> : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
