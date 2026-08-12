import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const MyProfile = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setPhone(user.phone || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await api.put(`/users/${user.id}`, {
        full_name: fullName,
        phone: phone
      });
      if (res.success) {
        setMessage('Profile updated successfully!');
      }
    } catch (err) {
      setMessage('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const memberDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US')
    : '8/10/2026';

  const formattedRole = user?.role_name
    ? user.role_name.charAt(0) + user.role_name.slice(1).toLowerCase().replace('_', ' ')
    : 'Student';

  return (
    <div className="container-fluid p-0">
      <div className="row g-4">
        {/* Left Card: Personal details */}
        <div className="col-lg-7">
          <div className="cf-card">
            <h5 className="fw-bold text-dark mb-4">Personal details</h5>

            {message && (
              <div className={`alert ${message.includes('success') ? 'alert-success' : 'alert-danger'} py-2 px-3 small rounded-3 mb-3`}>
                {message}
              </div>
            )}

            <form onSubmit={handleSaveChanges}>
              <div className="mb-3">
                <label className="form-label small fw-semibold text-muted">Full name</label>
                <input
                  type="text"
                  className="form-control cf-form-control"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-muted">Phone</label>
                <input
                  type="text"
                  className="form-control cf-form-control cf-form-control-disabled"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <label className="form-label small fw-semibold text-muted">Email</label>
                <input
                  type="email"
                  className="form-control cf-form-control"
                  value={email}
                  readOnly
                  disabled
                />
              </div>

              <button type="submit" className="btn btn-cf-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Card: Access */}
        <div className="col-lg-5">
          <div className="cf-card h-100">
            <h5 className="fw-bold text-dark mb-4">Access</h5>

            <div className="mb-4">
              <span className="badge bg-light text-dark border px-3 py-2 rounded-pill fw-medium" style={{ fontSize: '0.85rem' }}>
                {formattedRole}
              </span>
            </div>

            <div className="mb-3">
              <span className="text-muted me-2">Account status:</span>
              <strong className="text-dark">{user?.status === 'ACTIVE' ? 'Active' : user?.status || 'Active'}</strong>
            </div>

            <div>
              <span className="text-muted me-2">Member since</span>
              <strong className="text-dark">{memberDate}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
