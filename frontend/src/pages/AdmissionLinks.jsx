import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const AdmissionLinks = () => {
  const { role, user } = useAuth();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [courses, setCourses] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Pending admissions (SUBMITTED status for Admin review)
  const [pendingAdmissions, setPendingAdmissions] = useState([]);
  const [reviewModal, setReviewModal] = useState({ open: false, admission: null, action: '', remarks: '', batch_id: '', new_password: '', installment_count: '1' });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [batches, setBatches] = useState([]);

  const [form, setForm] = useState({ course_id: '', currency: 'ANY', expires_in_days: '30' });
  const [formError, setFormError] = useState('');

  const canManage = ['SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'].includes(role);
  const canReview = ['SUPER_ADMIN', 'ADMIN'].includes(role);

  useEffect(() => {
    fetchLinks();
    if (canReview) fetchPendingAdmissions();
    api.get('/courses?status=active').then(r => { if (r.success) setCourses(r.data.courses || []); }).catch(() => {});
    api.get('/batches').then(r => { if (r.success) setBatches(r.data.batches || []); }).catch(() => {});
  }, []);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admission-links');
      if (res.success) setLinks(res.data.links || []);
    } catch (err) {
      console.error('Failed to load admission links');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingAdmissions = async () => {
    try {
      const res = await api.get('/admissions?status=SUBMITTED');
      if (res.success) setPendingAdmissions(res.data.admissions || []);
    } catch (err) {
      console.error('Failed to load pending admissions');
    }
  };

  const handleCreateLink = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const res = await api.post('/admission-links', form);
      if (res.success) {
        fetchLinks();
        setShowCreate(false);
        setForm({ course_id: '', currency: 'ANY', expires_in_days: '30' });
      }
    } catch (err) {
      setFormError(typeof err === 'string' ? err : 'Failed to create link');
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = (url, id) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleReview = async (action) => {
    if (!reviewModal.admission) return;
    setReviewLoading(true);
    try {
      const endpoint = `/admissions/${reviewModal.admission.id}/${action}`;
      const payload = action === 'approve'
        ? {
            batch_id: reviewModal.batch_id || reviewModal.admission.batch_id,
            new_password: reviewModal.new_password,
            installment_count: reviewModal.installment_count
          }
        : { remarks: reviewModal.remarks };
      await api.patch(endpoint, payload);
      setReviewModal({ open: false, admission: null, action: '', remarks: '', batch_id: '', new_password: '', installment_count: '1' });
      fetchPendingAdmissions();
    } catch (err) {
      alert(typeof err === 'string' ? err : `Failed to ${action} admission`);
    } finally {
      setReviewLoading(false);
    }
  };

  const statusBadge = (s) => {
    const map = { ACTIVE: 'bg-success', EXPIRED: 'bg-secondary', USED: 'bg-info text-dark' };
    return `badge ${map[s] || 'bg-secondary'}`;
  };

  if (!canManage) {
    return <div className="alert alert-danger m-4"><i className="bi bi-shield-exclamation me-2"></i>Access denied.</div>;
  }

  return (
    <div className="cf-page-enter">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1"><i className="bi bi-link-45deg text-primary me-2"></i>Admission Links</h3>
          <p className="text-muted mb-0">Generate and share admission form links with prospective students.</p>
        </div>
        <button className="btn btn-primary rounded-pill px-4 fw-semibold shadow-sm" onClick={() => setShowCreate(true)}>
          <i className="bi bi-plus-circle me-2"></i>Generate New Link
        </button>
      </div>

      {/* Pending Submissions — Admin review panel */}
      {canReview && pendingAdmissions.length > 0 && (
        <div className="card border-0 border-start border-5 border-warning shadow-sm rounded-4 mb-4">
          <div className="card-header bg-warning bg-opacity-10 border-0 py-3">
            <h6 className="fw-bold mb-0">
              <i className="bi bi-clock-history text-warning me-2"></i>
              Pending Reviews ({pendingAdmissions.length})
            </h6>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 small">
                <thead className="table-light">
                  <tr>
                    <th>Admission No.</th>
                    <th>Applicant</th>
                    <th>Course</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingAdmissions.map(a => (
                    <tr key={a.id}>
                      <td className="font-monospace fw-semibold">{a.admission_number}</td>
                      <td>
                        <div className="fw-semibold">{a.student_name}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>{a.student_email}</div>
                      </td>
                      <td>{a.course_name || '—'}</td>
                      <td>{a.created_at?.split('T')[0]}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-sm btn-success rounded-pill px-3"
                            onClick={() => setReviewModal({ open: true, admission: a, action: 'approve', remarks: '', batch_id: a.batch_id || '', new_password: '', installment_count: '1' })}
                          >
                            <i className="bi bi-check-circle me-1"></i>Approve
                          </button>
                          <button
                            className="btn btn-sm btn-danger rounded-pill px-3"
                            onClick={() => setReviewModal({ open: true, admission: a, action: 'reject', remarks: '', batch_id: '', new_password: '', installment_count: '1' })}
                          >
                            <i className="bi bi-x-circle me-1"></i>Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Links Table */}
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-header bg-transparent border-bottom py-3">
          <span className="fw-semibold small">{links.length} link{links.length !== 1 ? 's' : ''} created</span>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
          ) : links.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-link fs-1 opacity-25 d-block mb-2"></i>
              No admission links yet. Generate one to share with prospective students.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 small">
                <thead className="table-light">
                  <tr>
                    <th>Link</th>
                    <th>Course</th>
                    <th>Currency</th>
                    <th>Created By</th>
                    <th>Submissions</th>
                    <th>Expires</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {links.map(l => (
                    <tr key={l.id}>
                      <td>
                        <span className="font-monospace text-muted" style={{ fontSize: 11 }}>{l.token?.substring(0, 12)}...</span>
                      </td>
                      <td>{l.course_name || <span className="text-muted">Any</span>}</td>
                      <td><span className="badge bg-secondary">{l.currency}</span></td>
                      <td>{l.created_by_name || '—'}</td>
                      <td className="text-center">
                        <span className="badge bg-info text-dark">{l.submissions_count || 0}</span>
                      </td>
                      <td>{l.expires_at ? new Date(l.expires_at).toLocaleDateString() : <span className="text-muted">Never</span>}</td>
                      <td><span className={statusBadge(l.status)}>{l.status}</span></td>
                      <td>
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-sm btn-outline-primary rounded-pill"
                            onClick={() => copyLink(l.admission_url, l.id)}
                            title="Copy link"
                          >
                            <i className={`bi ${copiedId === l.id ? 'bi-check-lg text-success' : 'bi-clipboard'}`}></i>
                            {copiedId === l.id ? ' Copied!' : ' Copy'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Link Modal */}
      {showCreate && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold"><i className="bi bi-link-45deg text-primary me-2"></i>Generate Admission Link</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreate(false)}></button>
              </div>
              <form onSubmit={handleCreateLink}>
                <div className="modal-body">
                  {formError && <div className="alert alert-danger py-2 small">{formError}</div>}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Pre-select Course (optional)</label>
                    <select className="form-select" value={form.course_id} onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}>
                      <option value="">— Let student choose —</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <div className="form-text">If selected, the form will pre-fill the course for the applicant.</div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Currency</label>
                    <select className="form-select" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                      <option value="ANY">Any (INR or USD)</option>
                      <option value="INR">INR only (₹)</option>
                      <option value="USD">USD only ($)</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Link Expiry (days)</label>
                    <input type="number" className="form-control" min="1" max="365" value={form.expires_in_days} onChange={e => setForm(f => ({ ...f, expires_in_days: e.target.value }))} />
                    <div className="form-text">Leave at 30 days by default.</div>
                  </div>
                </div>
                <div className="modal-footer border-top gap-2">
                  <button type="button" className="btn btn-light rounded-pill" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4 fw-semibold" disabled={submitting}>
                    {submitting ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-link-45deg me-2"></i>}
                    Generate Link
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Approve / Reject Modal */}
      {reviewModal.open && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className={`modal-header border-bottom ${reviewModal.action === 'approve' ? '' : 'bg-danger bg-opacity-10'}`}>
                <h5 className="modal-title fw-bold">
                  {reviewModal.action === 'approve' ? '✅ Approve Admission' : '❌ Reject Admission'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setReviewModal({ open: false, admission: null, action: '', remarks: '', batch_id: '', new_password: '', installment_count: '1' })}></button>
              </div>
              <div className="modal-body">
                <p className="text-muted small mb-3">
                  Applicant: <strong>{reviewModal.admission?.student_name}</strong> | {reviewModal.admission?.course_name}
                </p>
                {reviewModal.action === 'approve' ? (
                  <>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Assign Batch <span className="text-danger">*</span></label>
                      <select className="form-select" value={reviewModal.batch_id} onChange={e => setReviewModal(m => ({ ...m, batch_id: e.target.value }))}>
                        <option value="">— Select Batch —</option>
                        {batches.filter(b => ['UPCOMING', 'ONGOING'].includes(b.status)).map(b => (
                          <option key={b.id} value={b.id}>{b.name} ({b.batch_code})</option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Set Password for Student Account</label>
                      <input type="text" className="form-control font-monospace" placeholder="Min. 8 characters" value={reviewModal.new_password} onChange={e => setReviewModal(m => ({ ...m, new_password: e.target.value }))} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Number of Instalments</label>
                      <select className="form-select" value={reviewModal.installment_count} onChange={e => setReviewModal(m => ({ ...m, installment_count: e.target.value }))}>
                        {[1, 2, 3, 4, 6, 12].map(n => <option key={n} value={n}>{n} {n === 1 ? '(Full Payment)' : 'Instalments'}</option>)}
                      </select>
                    </div>
                  </>
                ) : (
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Reason for Rejection</label>
                    <textarea className="form-control" rows={3} placeholder="Explain the rejection reason..." value={reviewModal.remarks} onChange={e => setReviewModal(m => ({ ...m, remarks: e.target.value }))} />
                  </div>
                )}
              </div>
              <div className="modal-footer border-top gap-2">
                <button className="btn btn-light rounded-pill" onClick={() => setReviewModal({ open: false, admission: null, action: '', remarks: '', batch_id: '', new_password: '', installment_count: '1' })}>Cancel</button>
                <button
                  className={`btn rounded-pill px-4 fw-semibold ${reviewModal.action === 'approve' ? 'btn-success' : 'btn-danger'}`}
                  onClick={() => handleReview(reviewModal.action)}
                  disabled={reviewLoading || (reviewModal.action === 'approve' && !reviewModal.batch_id)}
                >
                  {reviewLoading ? <span className="spinner-border spinner-border-sm me-2"></span> : null}
                  {reviewModal.action === 'approve' ? 'Approve & Activate' : 'Reject Application'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdmissionLinks;
