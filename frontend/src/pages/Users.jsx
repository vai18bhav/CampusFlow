import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import { useAuth } from '../context/AuthContext';

const Users = () => {
  const { role, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const [formData, setFormData] = useState({
    role_id: '',
    full_name: '',
    email: '',
    password: 'password123',
    phone: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const [resU, resR, resP] = await Promise.all([
        api.get('/users'),
        api.get('/users/roles'),
        api.get('/users/pending-approvals')
      ]);

      if (resU.success) setUsers(resU.data.users);
      if (resR.success) setRoles(resR.data.roles);
      if (resP.success) setPendingApprovals(resP.data.pendingUsers);
    } catch (err) {
      console.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/users', formData);
      if (res.success) {
        setShowModal(false);
        setFormData({ role_id: '', full_name: '', email: '', password: 'password123', phone: '' });
        fetchUsers();
      }
    } catch (err) {
      alert(typeof err === 'string' ? err : 'User creation failed');
    }
  };

  const handleApproveAccount = async (userId) => {
    try {
      const res = await api.put(`/users/${userId}/approve`);
      if (res.success) {
        alert('Student account approved successfully!');
        fetchUsers();
      }
    } catch (err) {
      alert(typeof err === 'string' ? err : 'Approval failed');
    }
  };

  const handleRejectAccount = async (userId) => {
    try {
      const res = await api.put(`/users/${userId}/reject`);
      if (res.success) {
        alert('Student account rejected/deactivated');
        fetchUsers();
      }
    } catch (err) {
      alert(typeof err === 'string' ? err : 'Rejection failed');
    }
  };

  const handleToggleStatus = async (userObj) => {
    const newStatus = userObj.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.put(`/users/${userObj.id}`, { status: newStatus });
      fetchUsers();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (userId === user.id) {
      return alert('You cannot delete your own logged-in account.');
    }
    if (!window.confirm(`Are you sure you want to permanently delete user account "${userName}"?`)) {
      return;
    }

    try {
      const res = await api.delete(`/users/${userId}`);
      if (res.success) {
        fetchUsers();
      }
    } catch (err) {
      alert(typeof err === 'string' ? err : 'User deletion failed');
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-3 py-1.5 rounded-pill fw-semibold"><i className="bi bi-check-circle-fill me-1"></i> Active</span>;
      case 'PENDING':
        return <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 px-3 py-1.5 rounded-pill fw-semibold"><i className="bi bi-clock-fill me-1"></i> Pending Approval</span>;
      case 'INACTIVE':
        return <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-3 py-1.5 rounded-pill fw-semibold"><i className="bi bi-pause-circle-fill me-1"></i> Inactive</span>;
      default:
        return <span className="badge bg-secondary bg-opacity-10 text-secondary border px-3 py-1.5 rounded-pill fw-semibold">{status}</span>;
    }
  };

  const columns = [
    { header: 'Full Name', accessor: 'full_name', render: (r) => (
        <div className="d-flex align-items-center gap-2">
          <div className="user-avatar-badge" style={{ width: '32px', height: '32px', fontSize: '0.75rem' }}>
            {r.full_name ? `${r.full_name[0]}`.toUpperCase() : 'U'}
          </div>
          <span className="fw-bold text-dark">{r.full_name}</span>
        </div>
      )
    },
    { header: 'Email Address', accessor: 'email', render: (r) => <span className="font-monospace small text-muted">{r.email}</span> },
    { header: 'Assigned Role', accessor: 'role_name', render: (r) => <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2.5 py-1 rounded-pill fw-semibold">{r.role_name?.replace('_', ' ')}</span> },
    { header: 'Phone', accessor: 'phone', render: (r) => r.phone || <span className="text-muted small">N/A</span> },
    { header: 'Account Status', accessor: 'status', render: (r) => renderStatusBadge(r.status) },
    { header: 'Actions', accessor: 'id', render: (r) => (
        <div className="d-flex gap-1.5">
          <button
            className={`btn btn-sm ${r.status === 'ACTIVE' ? 'btn-outline-secondary' : 'btn-outline-success'} rounded-pill px-2.5 shadow-sm`}
            onClick={() => handleToggleStatus(r)}
            title="Toggle Status"
          >
            <i className={`bi ${r.status === 'ACTIVE' ? 'bi-person-x-fill' : 'bi-person-check-fill'} me-1`}></i>
            {r.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </button>
          {['SUPER_ADMIN', 'ADMIN'].includes(role) && r.id !== user.id && (
            <button
              className="btn btn-sm btn-outline-danger rounded-pill px-2.5 shadow-sm"
              onClick={() => handleDeleteUser(r.id, r.full_name)}
              title="Permanently Delete User"
            >
              <i className="bi bi-trash-fill me-1"></i> Delete
            </button>
          )}
        </div>
      )
    }
  ];

  const pendingColumns = [
    { header: 'Registration Date', accessor: 'created_at', render: (r) => <span className="small font-monospace text-muted">{r.created_at?.split('T')[0]}</span> },
    { header: 'Applicant Name', accessor: 'full_name', render: (r) => <span className="fw-bold text-dark">{r.full_name}</span> },
    { header: 'Email & Phone', accessor: 'email', render: (r) => <div><div className="font-monospace small">{r.email}</div><small className="text-muted">{r.phone}</small></div> },
    { header: 'Qualification', accessor: 'qualification', render: (r) => <span className="badge bg-info bg-opacity-10 text-info px-2.5 py-1 rounded-pill">{r.qualification || 'B.Tech / CS'}</span> },
    { header: 'Approval Actions', accessor: 'user_id', render: (r) => (
        <div className="d-flex gap-2">
          <button className="btn btn-sm btn-success fw-bold rounded-pill px-3 shadow-sm" onClick={() => handleApproveAccount(r.user_id)}>
            <i className="bi bi-check-circle-fill me-1"></i> Approve
          </button>
          <button className="btn btn-sm btn-outline-danger rounded-pill px-3" onClick={() => handleRejectAccount(r.user_id)}>
            <i className="bi bi-x-circle-fill me-1"></i> Reject
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="cf-page-enter">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1">System User Directory & Approvals</h3>
          <p className="text-muted mb-0">Review pending student registrations, assign staff roles, and manage access status.</p>
        </div>

        {['SUPER_ADMIN', 'ADMIN'].includes(role) && (
          <button className="btn btn-primary rounded-pill px-3.5 shadow-sm fw-semibold" onClick={() => setShowModal(true)}>
            <i className="bi bi-person-plus-fill me-1"></i> Create System User
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="d-flex gap-2 mb-4">
        <button
          className={`btn ${activeTab === 'all' ? 'btn-dark fw-bold shadow-sm' : 'btn-outline-secondary'} rounded-pill px-3.5`}
          onClick={() => setActiveTab('all')}
        >
          <i className="bi bi-people-fill me-1.5"></i> All Users ({users.length})
        </button>
        <button
          className={`btn ${activeTab === 'pending' ? 'btn-warning fw-bold text-dark shadow-sm' : 'btn-outline-warning'} rounded-pill px-3.5 position-relative`}
          onClick={() => setActiveTab('pending')}
        >
          <i className="bi bi-clock-history me-1.5"></i> Pending Registrations
          {pendingApprovals.length > 0 && (
            <span className="badge rounded-pill bg-danger ms-2" style={{ fontSize: '0.7rem' }}>{pendingApprovals.length}</span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : activeTab === 'pending' ? (
        <DataTable columns={pendingColumns} data={pendingApprovals} searchKey="full_name" title="Pending Student Registrations (Requires Admin Approval)" />
      ) : (
        <DataTable columns={columns} data={users} searchKey="full_name" title="Registered User Accounts" />
      )}

      {/* Create User Modal */}
      {showModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">Create System User</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleCreateUser}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">System Role</label>
                    <select className="form-select cf-form-control" value={formData.role_id} onChange={e => setFormData({ ...formData, role_id: e.target.value })} required>
                      <option value="">-- Select Role --</option>
                      {roles.map(r => <option key={r.id} value={r.id}>{r.name} ({r.description})</option>)}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Full Name</label>
                    <input type="text" className="form-control cf-form-control" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} required />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Email Address</label>
                      <input type="email" className="form-control cf-form-control" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Phone Number</label>
                      <input type="text" className="form-control cf-form-control" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Initial Password</label>
                    <input type="text" className="form-control cf-form-control" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-light rounded-pill" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4 fw-semibold">Create User Account</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
