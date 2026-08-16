import React, { useState, useEffect } from 'react';
import api from '../services/api';

const STATUS_CONFIG = {
  PENDING:  { color: '#f59e0b', bg: '#fef3c7', icon: '⏳', label: 'Pending' },
  APPROVED: { color: '#10b981', bg: '#d1fae5', icon: '✅', label: 'Approved' },
  REJECTED: { color: '#ef4444', bg: '#fee2e2', icon: '❌', label: 'Rejected' }
};

export default function EnrollmentRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [toast, setToast] = useState(null);
  const [approveModal, setApproveModal] = useState(null); // request to approve
  const [rejectModal, setRejectModal] = useState(null);   // request to reject
  const [batches, setBatches] = useState([]);
  const [approveForm, setApproveForm] = useState({ batch_id: '', admin_remarks: '' });
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
    // Pre-filter batches for this course
    setApproveModal(req);
    setApproveForm({ batch_id: '', admin_remarks: '' });
  };

  const openReject = (req) => {
    setRejectModal(req);
    setRejectRemarks('');
  };

  const handleApprove = async (e) => {
    e.preventDefault();
    if (!approveForm.batch_id) { showToast('Please select a batch', 'error'); return; }
    setSubmitting(true);
    try {
      const r = await api.patch(`/enrollments/${approveModal.id}/approve`, approveForm);
      showToast(`✅ ${r.message || 'Enrollment approved! Student enrolled and email sent.'}`);
      setApproveModal(null);
      fetchRequests();
    } catch (err) {
      // Surface the specific error (e.g. insufficient coins)
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

  // Batches relevant to a course
  const courseBatches = (courseId) => batches.filter(b => b.course_id === courseId && ['UPCOMING', 'ONGOING'].includes(b.status));

  return (
    <div style={{ padding: '1.5rem' }}>
      {toast && (
        <div style={{ position: 'fixed', top: '1rem', right: '1rem', padding: '0.85rem 1.4rem', borderRadius: '10px', background: toast.type === 'error' ? '#ef4444' : '#10b981', color: '#fff', fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', maxWidth: '400px' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          📋 Enrollment Requests
        </h2>
        <p style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Review and approve student course enrollment requests. Approved students are auto-enrolled in the selected batch.</p>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(tab => {
          const cfg = tab === 'ALL' ? { color: '#6b7280', bg: '#f1f5f9', icon: '📋' } : STATUS_CONFIG[tab];
          return (
            <button key={tab} onClick={() => setFilter(tab)}
              style={{ padding: '0.5rem 1.2rem', borderRadius: '999px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.15s',
                background: filter === tab ? (tab === 'ALL' ? '#6b7280' : cfg.color) : cfg.bg,
                color: filter === tab ? '#fff' : cfg.color }}>
              {cfg.icon} {tab.charAt(0) + tab.slice(1).toLowerCase()} ({counts[tab]})
            </button>
          );
        })}
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
            const cfg = STATUS_CONFIG[req.status];
            return (
              <div key={req.id} style={{ padding: '1.4rem', borderRadius: '14px', background: 'var(--card-bg)', border: `1px solid ${req.status === 'PENDING' ? '#f59e0b40' : 'var(--border-color)'}`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  {/* Left: Student & Course Info */}
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>
                        {req.student_name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem' }}>{req.student_name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{req.student_email}</div>
                      </div>
                    </div>
                    <div style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', background: '#8b5cf610', marginBottom: '0.5rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>📚 {req.course_name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{req.course_code} &nbsp;·&nbsp; ₹{parseFloat(req.fee_amount || 0).toLocaleString('en-IN')}</div>
                    </div>
                    {req.message && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.4rem 0.7rem', borderRadius: '6px', borderLeft: '3px solid #8b5cf6', background: 'var(--bg-secondary, #f8fafc)' }}>
                        "{req.message}"
                      </div>
                    )}
                    {req.batch_name && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: '#10b981', fontWeight: 600 }}>🏫 Batch: {req.batch_name} ({req.batch_code})</div>
                    )}
                    {req.admin_remarks && (
                      <div style={{ marginTop: '0.3rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Admin note: {req.admin_remarks}</div>
                    )}
                  </div>

                  {/* Right: Status & Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.6rem' }}>
                    <span style={{ padding: '0.3rem 1rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, background: cfg.bg, color: cfg.color }}>
                      {cfg.icon} {cfg.label}
                    </span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                      {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    {req.status === 'PENDING' && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => openApprove(req)}
                          style={{ padding: '0.45rem 1.1rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #10b981, #3b82f6)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                          ✅ Approve
                        </button>
                        <button onClick={() => openReject(req)}
                          style={{ padding: '0.45rem 1.1rem', borderRadius: '8px', border: 'none', background: '#ef444415', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
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

      {/* Approve Modal */}
      {approveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '18px', padding: '2rem', width: '100%', maxWidth: '480px', boxShadow: '0 24px 70px rgba(0,0,0,0.4)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.4rem' }}>✅</div>
              <h3 style={{ margin: 0, fontWeight: 800 }}>Approve Enrollment</h3>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.4rem' }}>
                Enrolling <strong>{approveModal.student_name}</strong> in <strong>{approveModal.course_name}</strong>
              </div>
            </div>
            <form onSubmit={handleApprove} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Coin info */}
              <div style={{ padding: '1rem', borderRadius: '12px', background: 'linear-gradient(135deg, #7c3aed10, #f59e0b10)', border: '1px solid #f59e0b30' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>COINS TO DEDUCT</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#f59e0b' }}>🪙 {Math.round(parseFloat(approveModal.fee_amount || 0)).toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>STUDENT BALANCE</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: (approveModal.student_coins ?? 0) >= Math.round(parseFloat(approveModal.fee_amount || 0)) ? '#10b981' : '#ef4444' }}>
                      🪙 {(approveModal.student_coins ?? 0).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>AFTER DEDUCTION</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#6b7280' }}>
                      🪙 {Math.max(0, (approveModal.student_coins ?? 0) - Math.round(parseFloat(approveModal.fee_amount || 0))).toLocaleString()}
                    </div>
                  </div>
                </div>
                {(approveModal.student_coins ?? 0) < Math.round(parseFloat(approveModal.fee_amount || 0)) && (
                  <div style={{ marginTop: '0.7rem', padding: '0.5rem 0.8rem', borderRadius: '8px', background: '#fee2e2', color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}>
                    ⚠ Student has insufficient coins! Approval will fail.
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Select Batch *</label>
                <select value={approveForm.batch_id} onChange={e => setApproveForm({ ...approveForm, batch_id: e.target.value })} required
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
                  <option value=''>— Select a Batch —</option>
                  {(courseBatches(approveModal.course_id).length > 0 ? courseBatches(approveModal.course_id) : batches).map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.batch_code}) — {b.status}</option>
                  ))}
                </select>
                {courseBatches(approveModal.course_id).length === 0 && (
                  <div style={{ fontSize: '0.78rem', color: '#f59e0b', marginTop: '0.3rem' }}>⚠ No active batches for this course. Showing all batches.</div>
                )}
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Admin Remarks (optional)</label>
                <textarea value={approveForm.admin_remarks} onChange={e => setApproveForm({ ...approveForm, admin_remarks: e.target.value })} placeholder='e.g. Welcome! Classes start Monday at 9 AM...' rows={3}
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ padding: '0.7rem', borderRadius: '10px', background: '#d1fae5', border: '1px solid #6ee7b7', fontSize: '0.82rem', color: '#065f46' }}>
                📧 An approval email will be automatically sent to <strong>{approveModal.student_email}</strong>.
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type='button' onClick={() => setApproveModal(null)} style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button type='submit' disabled={submitting} style={{ flex: 2, padding: '0.8rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #10b981, #3b82f6)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                  {submitting ? 'Approving...' : '✅ Approve & Enroll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '18px', padding: '2rem', width: '100%', maxWidth: '440px', boxShadow: '0 24px 70px rgba(0,0,0,0.4)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.4rem' }}>❌</div>
              <h3 style={{ margin: 0, fontWeight: 800 }}>Reject Enrollment</h3>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.4rem' }}>
                Rejecting <strong>{rejectModal.student_name}</strong>'s request for <strong>{rejectModal.course_name}</strong>
              </div>
            </div>
            <form onSubmit={handleReject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Reason for Rejection (optional)</label>
                <textarea value={rejectRemarks} onChange={e => setRejectRemarks(e.target.value)} placeholder='e.g. Batch is full, please apply for next batch...' rows={4}
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ padding: '0.7rem', borderRadius: '10px', background: '#fee2e2', border: '1px solid #fca5a5', fontSize: '0.82rem', color: '#991b1b' }}>
                📧 A rejection notification email will be sent to <strong>{rejectModal.student_email}</strong>.
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type='button' onClick={() => setRejectModal(null)} style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button type='submit' disabled={submitting} style={{ flex: 2, padding: '0.8rem', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                  {submitting ? 'Rejecting...' : '❌ Reject Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
