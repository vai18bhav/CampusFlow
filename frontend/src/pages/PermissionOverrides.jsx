import React, { useState, useEffect } from 'react';
import api from '../services/api';

const PermissionOverrides = () => {
  const [overrides, setOverrides] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    user_id: '',
    permission: 'ADMISSION_MANAGEMENT',
    action: 'GRANT',
    expires_at: ''
  });

  const PERMISSION_OPTIONS = [
    { value: 'ADMISSION_MANAGEMENT', label: 'Admission & Coupon Management' },
    { value: 'FINANCE_MANAGEMENT', label: 'Invoice & Instalment Management' },
    { value: 'BATCH_MANAGEMENT', label: 'Batch & Attendance Management' },
    { value: 'ASSIGNMENT_CREATE', label: 'Assignment Creation & Grading' },
    { value: 'MOCK_ACCEPT_REJECT', label: 'Mock Interview Review & Acceptance' },
    { value: 'REPORTS_FULL', label: 'Full Executive Reports Access' },
    { value: '*', label: 'Full System Access (Wildcard)' }
  ];

  useEffect(() => {
    fetchOverrides();
    api.get('/users').then(r => { if (r.success) setUsers(r.data?.users || []); }).catch(() => {});
  }, []);

  const fetchOverrides = async () => {
    setLoading(true);
    try {
      const res = await api.get('/permission-overrides');
      if (res.success) {
        setOverrides(res.data?.overrides || []);
      }
    } catch (err) {
      setMsg({ text: 'Failed to fetch permission overrides', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.user_id || !form.permission || !form.expires_at) {
      setMsg({ text: 'User, Permission, and Expiry date/time are required', type: 'danger' });
      return;
    }

    setSubmitting(true); setMsg({ text: '', type: '' });
    try {
      const res = await api.post('/permission-overrides', form);
      if (res.success) {
        setMsg({ text: 'Temporary permission override created!', type: 'success' });
        setShowModal(false);
        setForm({ user_id: '', permission: 'ADMISSION_MANAGEMENT', action: 'GRANT', expires_at: '' });
        fetchOverrides();
      }
    } catch (err) {
      setMsg({ text: typeof err === 'string' ? err : 'Failed to create override', type: 'danger' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm('Are you sure you want to revoke this temporary permission override?')) return;

    try {
      const res = await api.delete(`/permission-overrides/${id}`);
      if (res.success) {
        setMsg({ text: 'Permission override revoked', type: 'success' });
        fetchOverrides();
      }
    } catch (err) {
      setMsg({ text: typeof err === 'string' ? err : 'Failed to revoke override', type: 'danger' });
    }
  };

  return (
    <div className="container-fluid py-3">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">
            <i className="bi bi-key-fill text-primary me-2"></i>Role-Based Access Permission Overrides
          </h4>
          <p className="text-muted small mb-0">FR-007: Temporarily grant or restrict permissions for a user without altering their permanent role</p>
        </div>
        <button className="btn btn-primary rounded-pill px-4 fw-semibold shadow-sm" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-circle me-2"></i>Grant / Restrict Override
        </button>
      </div>

      {msg.text && (
        <div className={`alert alert-${msg.type} alert-dismissible fade show small rounded-3 mb-4`} role="alert">
          {msg.text}
          <button type="button" className="btn-close" onClick={() => setMsg({ text: '', type: '' })}></button>
        </div>
      )}

      {/* Info Card */}
      <div className="alert alert-info border-0 rounded-4 p-3 mb-4 small d-flex align-items-center gap-3">
        <i className="bi bi-info-circle-fill fs-3 text-info"></i>
        <div>
          <strong>Temporary Override Rule:</strong> Super Admin can grant extra access or restrict existing access for any user with a mandatory expiration date/time. The user's permanent role remains unchanged. When the expiry date/time passes, the user automatically reverts to their normal role permissions. All overrides are logged in Audit Logs.
        </div>
      </div>

      {/* Overrides Table */}
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr className="small text-muted text-uppercase">
                  <th>ID</th>
                  <th>User</th>
                  <th>Permanent Role</th>
                  <th>Override Action</th>
                  <th>Permission Scope</th>
                  <th>Expires At</th>
                  <th>Status</th>
                  <th>Created By</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody className="small">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4 text-muted">
                      <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                      Loading permission overrides...
                    </td>
                  </tr>
                ) : overrides.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4 text-muted">
                      <i className="bi bi-shield-slash fs-4 d-block mb-1"></i>No active or historical permission overrides.
                    </td>
                  </tr>
                ) : (
                  overrides.map(ov => (
                    <tr key={ov.id} className={ov.is_expired ? 'opacity-75 bg-light' : ''}>
                      <td className="fw-bold">#{ov.id}</td>
                      <td>
                        <div className="fw-bold text-dark">{ov.user_name}</div>
                        <div className="text-muted extra-small">{ov.user_email}</div>
                      </td>
                      <td>
                        <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 px-2 py-1">
                          {ov.role_name}
                        </span>
                      </td>
                      <td>
                        <span className={`badge border px-2.5 py-1 ${ov.action === 'GRANT' ? 'bg-success bg-opacity-15 text-success border-success' : 'bg-danger bg-opacity-15 text-danger border-danger'}`}>
                          {ov.action === 'GRANT' ? '➕ GRANT' : '🚫 RESTRICT'}
                        </span>
                      </td>
                      <td>
                        <code className="text-primary fw-semibold">{ov.permission}</code>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {new Date(ov.expires_at).toLocaleString()}
                      </td>
                      <td>
                        {ov.is_expired ? (
                          <span className="badge bg-secondary px-2 py-1">EXPIRED</span>
                        ) : (
                          <span className="badge bg-success px-2 py-1">ACTIVE</span>
                        )}
                      </td>
                      <td className="text-muted">{ov.created_by_name || 'Super Admin'}</td>
                      <td>
                        {!ov.is_expired && (
                          <button className="btn btn-sm btn-outline-danger rounded-pill px-2.5 py-1" onClick={() => handleRevoke(ov.id)}>
                            <i className="bi bi-trash me-1"></i>Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold">New Temporary Permission Override</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleCreate}>
                <div className="modal-body py-3">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Target User <span className="text-danger">*</span></label>
                    <select className="form-select" value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })} required>
                      <option value="">— Select User —</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.full_name} ({u.role_name} — {u.email})</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Override Type <span className="text-danger">*</span></label>
                    <div className="d-flex gap-3">
                      <div className="form-check">
                        <input className="form-check-input" type="radio" name="action" id="actionGrant" value="GRANT" checked={form.action === 'GRANT'} onChange={e => setForm({ ...form, action: e.target.value })} />
                        <label className="form-check-label text-success fw-semibold" htmlFor="actionGrant">Grant Additional Permission</label>
                      </div>
                      <div className="form-check">
                        <input className="form-check-input" type="radio" name="action" id="actionRestrict" value="RESTRICT" checked={form.action === 'RESTRICT'} onChange={e => setForm({ ...form, action: e.target.value })} />
                        <label className="form-check-label text-danger fw-semibold" htmlFor="actionRestrict">Restrict Existing Access</label>
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Permission Scope <span className="text-danger">*</span></label>
                    <select className="form-select" value={form.permission} onChange={e => setForm({ ...form, permission: e.target.value })} required>
                      {PERMISSION_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label} ({opt.value})</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Expiration Date &amp; Time <span className="text-danger">*</span></label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={form.expires_at}
                      onChange={e => setForm({ ...form, expires_at: e.target.value })}
                      required
                    />
                    <span className="form-text text-muted small">Access will automatically revert after this timestamp</span>
                  </div>
                </div>

                <div className="modal-footer border-top-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary rounded-pill" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4" disabled={submitting}>
                    {submitting ? 'Applying...' : 'Apply Override'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionOverrides;
