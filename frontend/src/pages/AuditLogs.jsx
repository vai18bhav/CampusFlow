import React, { useState, useEffect } from 'react';
import api from '../services/api';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [actionTypes, setActionTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  useEffect(() => {
    // Load users and action types for dropdowns
    api.get('/users').then(r => { if (r.success) setUsers(r.data?.users || []); }).catch(() => {});
    api.get('/audit-logs/actions').then(r => { if (r.success) setActionTypes(r.data?.actions || []); }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [page, from, to, selectedUser, selectedAction]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      if (selectedUser) params.append('user_id', selectedUser);
      if (selectedAction) params.append('action', selectedAction);
      params.append('page', page);
      params.append('limit', 25);

      const res = await api.get(`/audit-logs?${params.toString()}`);
      if (res.success) {
        setLogs(res.data?.logs || []);
        setPagination(res.data?.pagination || { total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFrom(''); setTo(''); setSelectedUser(''); setSelectedAction(''); setPage(1);
  };

  const getActionBadgeClass = (action) => {
    const act = (action || '').toUpperCase();
    if (act.includes('CREATE') || act.includes('APPROVE') || act.includes('GRANT')) return 'bg-success bg-opacity-15 text-success border-success';
    if (act.includes('DELETE') || act.includes('REJECT') || act.includes('RESTRICT') || act.includes('REVOKE')) return 'bg-danger bg-opacity-15 text-danger border-danger';
    if (act.includes('UPDATE') || act.includes('EDIT')) return 'bg-warning bg-opacity-15 text-warning border-warning';
    return 'bg-info bg-opacity-15 text-info border-info';
  };

  return (
    <div className="container-fluid py-3">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">
            <i className="bi bi-shield-check text-primary me-2"></i>Audit Logs &amp; Activity Tracking
          </h4>
          <p className="text-muted small mb-0">FR-004: Track user actions, login activity, record changes, datetime, and IP addresses</p>
        </div>
        <button className="btn btn-outline-secondary btn-sm rounded-pill px-3" onClick={clearFilters}>
          <i className="bi bi-arrow-counterclockwise me-1"></i>Reset Filters
        </button>
      </div>

      {/* Filter Card */}
      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body p-3">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label small fw-semibold">From Date</label>
              <input type="date" className="form-control form-control-sm" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">To Date</label>
              <input type="date" className="form-control form-control-sm" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Filter by User</label>
              <select className="form-select form-select-sm" value={selectedUser} onChange={e => { setSelectedUser(e.target.value); setPage(1); }}>
                <option value="">All Users</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name} ({u.role_name})</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Filter by Action Type</label>
              <select className="form-select form-select-sm" value={selectedAction} onChange={e => { setSelectedAction(e.target.value); setPage(1); }}>
                <option value="">All Action Types</option>
                {actionTypes.map(act => (
                  <option key={act} value={act}>{act}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr className="small text-muted text-uppercase">
                  <th>ID</th>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Target Entity</th>
                  <th>IP Address</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody className="small">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-muted">
                      <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                      Loading audit records...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-muted">
                      <i className="bi bi-inbox fs-4 d-block mb-1"></i>No audit log records found matching filters.
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id}>
                      <td className="fw-bold">#{log.id}</td>
                      <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="fw-semibold text-dark">
                        {log.user_name || 'System / Guest'}
                        {log.user_email && <div className="text-muted extra-small">{log.user_email}</div>}
                      </td>
                      <td>
                        <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 px-2 py-1">
                          {log.user_role || 'GUEST'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge border px-2.5 py-1.5 ${getActionBadgeClass(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="text-muted">
                        {log.entity_type ? `${log.entity_type} #${log.entity_id || ''}` : '—'}
                      </td>
                      <td className="font-monospace text-muted small">{log.ip_address || '127.0.0.1'}</td>
                      <td className="text-muted" style={{ maxWidth: 300 }}>
                        <div className="text-truncate" title={log.details}>{log.details || '—'}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center p-3 border-top">
              <span className="small text-muted">
                Showing {logs.length} of {pagination.total} audit logs
              </span>
              <div className="btn-group">
                <button
                  className="btn btn-sm btn-outline-secondary"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
