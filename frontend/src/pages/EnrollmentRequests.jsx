import React, { useState, useEffect } from 'react';
import api from '../services/api';

const STATUS_CONFIG = {
  PENDING:  { color: '#f59e0b', bg: '#fef3c7', icon: '⏳', label: 'Pending' },
  APPROVED: { color: '#10b981', bg: '#d1fae5', icon: '✅', label: 'Approved' },
  REJECTED: { color: '#ef4444', bg: '#fee2e2', icon: '❌', label: 'Rejected' }
};

const PLAN_LABELS = {
  FULL: '💳 Full Payment (100% Upfront)',
  '2_INSTALLMENTS': '📦 2 Installments (50% + 50%)',
  '3_INSTALLMENTS': '📦 3 Installments (40% + 30% + 30%)',
  '4_INSTALLMENTS': '📦 4 Installments (25% × 4)'
};

export default function EnrollmentRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [toast, setToast] = useState(null);
  const [approveModal, setApproveModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [batches, setBatches] = useState([]);
  const [approveForm, setApproveForm] = useState({ batch_id: '', admin_remarks: '', payment_plan: 'FULL' });
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const r = await api.get('/enrollments');
      setRequests(r.data?.requests || []);
    } catch (e) { }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
    api.get('/batches').then(r => setBatches(r.data?.batches || [])).catch(() => {});
  }, []);

  const openApprove = (req) => {
    setApproveModal(req);
    setApproveForm({
      batch_id: '',
      admin_remarks: '',
      payment_plan: req.payment_plan || 'FULL'
    });
  };

  const openReject = (req) => {
    setRejectModal(req);
    setRejectRemarks('');
  };

  const handleApprove = async (e) => {
    e.preventDefault();
    if (!approveForm.batch_id) { showToast('Please select a batch for this student', 'error'); return; }
    setSubmitting(true);
    try {
      const r = await api.patch(`/enrollments/${approveModal.id}/approve`, approveForm);
      showToast(`✅ ${r.message || 'Enrollment approved! Student enrolled and milestones created.'}`);
      setApproveModal(null);
      fetchRequests();
    } catch (err) {
      const msg = typeof err === 'string' ? err : err?.message || 'Failed to approve enrollment';
      showToast(`❌ ${msg}`, 'error');
    }
    setSubmitting(false);
  };

  const handleReject = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch(`/enrollments/${rejectModal.id}/reject`, { admin_remarks: rejectRemarks });
      showToast('Request rejected. Student notified via email.');
      setRejectModal(null);
      fetchRequests();
    } catch (err) { showToast(err || 'Failed to reject', 'error'); }
    setSubmitting(false);
  };

  const filtered = requests.filter(r => filter === 'ALL' ? true : r.status === filter);
  const counts = {
    ALL: requests.length,
    PENDING: requests.filter(r => r.status === 'PENDING').length,
    APPROVED: requests.filter(r => r.status === 'APPROVED').length,
    REJECTED: requests.filter(r => r.status === 'REJECTED').length
  };

  const courseBatches = (courseId) => batches.filter(b => b.course_id === courseId && ['UPCOMING', 'ONGOING'].includes(b.status));

  return (
    <div style={{ padding: '1.5rem' }}>
      {toast && (
        <div style={{ position: 'fixed', top: '1rem', right: '1rem', padding: '0.85rem 1.4rem', borderRadius: '10px', background: toast.type === 'error' ? '#ef4444' : '#10b981', color: '#fff', fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', maxWidth: '420px', lineHeight: 1.4 }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          📋 Student Course Enrollment Requests
        </h2>
        <p style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Review student enrollment applications, assign batches, and approve flexible installment plans with automated coin deductions.
        </p>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map(tab => (
          <button key={tab} onClick={() => setFilter(tab)}
            style={{ padding: '0.5rem 1.2rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: filter === tab ? 'linear-gradient(135deg, #8b5cf6, #3b82f6)' : 'var(--card-bg)', color: filter === tab ? '#fff' : 'var(--text-primary)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}>
            <span>{tab}</span>
            <span style={{ padding: '0.1rem 0.5rem', borderRadius: '999px', background: filter === tab ? 'rgba(255,255,255,0.25)' : 'var(--bg-secondary, #f1f5f9)', fontSize: '0.75rem', fontWeight: 800 }}>
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading requests...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
          <p>No {filter.toLowerCase()} enrollment requests found.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map(req => {
            const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
            const fee = Math.round(parseFloat(req.fee_amount || 0));
            const planLabel = PLAN_LABELS[req.payment_plan] || '💳 Full Payment';

            return (
              <div key={req.id} style={{ padding: '1.4rem', borderRadius: '14px', background: 'var(--card-bg)', border: `1px solid ${req.status === 'PENDING' ? '#f59e0b40' : 'var(--border-color)'}`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  {/* Left: Student & Course Info */}
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>
                        {req.student_name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem' }}>{req.student_name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{req.student_email} {req.student_phone ? `• ${req.student_phone}` : ''}</div>
                      </div>
                    </div>

                    <div style={{ padding: '0.7rem 0.9rem', borderRadius: '10px', background: 'var(--cf-input-bg, rgba(139,92,246,0.06))', border: '1px solid var(--cf-border, #e2e8f0)', marginBottom: '0.6rem' }}>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <strong style={{ color: 'var(--cf-text-main)', fontSize: '0.95rem' }}>📚 {req.course_name}</strong>
                        <span className="badge bg-warning bg-opacity-20 text-dark fw-bold px-2.5 py-1 rounded-pill">
                          🪙 {fee.toLocaleString('en-IN')} Coins
                        </span>
                      </div>
                      <div className="d-flex flex-wrap gap-2 align-items-center mt-1">
                        <span className="badge bg-primary bg-opacity-15 text-primary border border-primary border-opacity-25 px-2 py-0.5 rounded-pill small">
                          {planLabel}
                        </span>
                        {req.coins_deducted > 0 && (
                          <span className="badge bg-success bg-opacity-15 text-success px-2 py-0.5 rounded-pill small">
                            Deducted: {req.coins_deducted} 🪙
                          </span>
                        )}
                      </div>
                    </div>

                    {req.message && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.4rem 0.7rem', borderRadius: '6px', borderLeft: '3px solid #8b5cf6', background: 'var(--bg-secondary, #f8fafc)', marginBottom: '0.4rem' }}>
                        "{req.message}"
                      </div>
                    )}
                    {req.batch_name && (
                      <div style={{ fontSize: '0.84rem', color: '#10b981', fontWeight: 700 }}>
                        🏫 Enrolled in: {req.batch_name} ({req.batch_code})
                      </div>
                    )}
                    {req.admin_remarks && (
                      <div style={{ marginTop: '0.3rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Admin note: {req.admin_remarks}
                      </div>
                    )}
                  </div>

                  {/* Right: Status & Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.6rem' }}>
                    <span style={{ padding: '0.35rem 1.1rem', borderRadius: '999px', fontSize: '0.82rem', fontWeight: 800, background: cfg.bg, color: cfg.color }}>
                      {cfg.icon} {cfg.label}
                    </span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                      {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    {req.status === 'PENDING' && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                        <button onClick={() => openApprove(req)}
                          style={{ padding: '0.5rem 1.2rem', borderRadius: '9px', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '0.86rem', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}>
                          ✅ Approve & Enroll
                        </button>
                        <button onClick={() => openReject(req)}
                          style={{ padding: '0.5rem 1rem', borderRadius: '9px', border: '1px solid #ef444440', background: '#ef444415', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: '0.86rem' }}>
                          ❌ Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── APPROVE MODAL ── */}
      {approveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '18px', padding: '2rem', width: '100%', maxWidth: '500px', boxShadow: '0 24px 70px rgba(0,0,0,0.4)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.4rem' }}>✅</div>
              <h3 style={{ margin: 0, fontWeight: 800 }}>Approve Enrollment</h3>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.4rem' }}>
                Enrolling <strong>{approveModal.student_name}</strong> in <strong>{approveModal.course_name}</strong>
              </div>
            </div>

            <form onSubmit={handleApprove} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Payment Plan Selection */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  Payment / Installment Plan
                </label>
                <select
                  value={approveForm.payment_plan}
                  onChange={e => setApproveForm({ ...approveForm, payment_plan: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}
                >
                  <option value="FULL">💳 Full Payment (100% Upfront)</option>
                  <option value="2_INSTALLMENTS">📦 2 Installments (50% + 50%)</option>
                  <option value="3_INSTALLMENTS">📦 3 Installments (40% + 30% + 30%)</option>
                  <option value="4_INSTALLMENTS">📦 4 Installments (25% × 4)</option>
                </select>
              </div>

              {/* Batch Assignment */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  Assign to Batch *
                </label>
                <select
                  value={approveForm.batch_id}
                  onChange={e => setApproveForm({ ...approveForm, batch_id: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}
                >
                  <option value="">— Select Target Batch —</option>
                  {courseBatches(approveModal.course_id).map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.batch_code}) {b.timing ? `— ${b.timing}` : ''}</option>
                  ))}
                  {batches.filter(b => b.course_id !== approveModal.course_id).map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.batch_code})</option>
                  ))}
                </select>
              </div>

              {/* Admin Remarks */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  Admin Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Welcome aboard! Batch starts next Monday."
                  value={approveForm.admin_remarks}
                  onChange={e => setApproveForm({ ...approveForm, admin_remarks: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setApproveModal(null)}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  style={{ flex: 2, padding: '0.75rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '0.92rem', boxShadow: '0 4px 14px rgba(16,185,129,0.35)' }}>
                  {submitting ? '⏳ Processing...' : 'Confirm Approval & Deduct Coins 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── REJECT MODAL ── */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '18px', padding: '2rem', width: '100%', maxWidth: '420px', boxShadow: '0 24px 70px rgba(0,0,0,0.4)' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontWeight: 800, color: '#ef4444' }}>Reject Enrollment</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.2rem' }}>
              Are you sure you want to reject <strong>{rejectModal.student_name}</strong>'s enrollment for <strong>{rejectModal.course_name}</strong>?
            </p>
            <form onSubmit={handleReject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <textarea
                rows="3"
                placeholder="Reason for rejection (will be sent to student)..."
                value={rejectRemarks}
                onChange={e => setRejectRemarks(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
              />
              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <button type="button" onClick={() => setRejectModal(null)}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  {submitting ? 'Rejecting...' : 'Reject Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
