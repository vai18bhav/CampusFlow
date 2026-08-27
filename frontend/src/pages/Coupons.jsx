import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Coupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const [form, setForm] = useState({
    code: '',
    discount_type: 'PERCENTAGE',
    discount_value: '',
    valid_until: '',
    max_uses: '100',
    currency: 'INR',
    min_order_value: '0'
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await api.get('/coupons');
      if (res.success) {
        setCoupons(res.data?.coupons || []);
      }
    } catch (err) {
      setMsg({ text: 'Failed to fetch coupons', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.code || !form.discount_value) {
      setMsg({ text: 'Coupon Code and Discount Value are required.', type: 'danger' });
      return;
    }

    setSubmitting(true); setMsg({ text: '', type: '' });
    try {
      const res = await api.post('/coupons', form);
      if (res.success) {
        setMsg({ text: 'Coupon created successfully!', type: 'success' });
        setShowModal(false);
        setForm({ code: '', discount_type: 'PERCENTAGE', discount_value: '', valid_until: '', max_uses: '100', currency: 'INR', min_order_value: '0' });
        fetchCoupons();
      }
    } catch (err) {
      setMsg({ text: typeof err === 'string' ? err : 'Coupon creation failed.', type: 'danger' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (coupon) => {
    try {
      const nextStatus = !coupon.is_active;
      const res = await api.patch(`/coupons/${coupon.id}/status`, { is_active: nextStatus });
      if (res.success) {
        fetchCoupons();
      }
    } catch (err) {
      alert('Failed to update coupon status');
    }
  };

  const handleDelete = async (id, code) => {
    if (!window.confirm(`Delete coupon code "${code}"?`)) return;
    try {
      const res = await api.delete(`/coupons/${id}`);
      if (res.success) {
        fetchCoupons();
      }
    } catch (err) {
      alert('Failed to delete coupon');
    }
  };

  return (
    <div className="container-fluid py-3">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">
            <i className="bi bi-ticket-perforated-fill text-primary me-2"></i>Coupon &amp; Discount Management
          </h4>
          <p className="text-muted small mb-0">FR-003: Create and manage promotional discount coupons for student admissions</p>
        </div>
        <button className="btn btn-primary rounded-pill px-4 fw-semibold shadow-sm" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-circle me-2"></i>Create New Coupon
        </button>
      </div>

      {msg.text && (
        <div className={`alert alert-${msg.type} alert-dismissible fade show small rounded-3 mb-4`} role="alert">
          {msg.text}
          <button type="button" className="btn-close" onClick={() => setMsg({ text: '', type: '' })}></button>
        </div>
      )}

      {/* Coupons Table */}
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr className="small text-muted text-uppercase">
                  <th>ID</th>
                  <th>Coupon Code</th>
                  <th>Discount</th>
                  <th>Currency</th>
                  <th>Min Fee Req.</th>
                  <th>Redemptions</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="small">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4 text-muted">
                      <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                      Loading coupons...
                    </td>
                  </tr>
                ) : coupons.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4 text-muted">
                      <i className="bi bi-ticket-slash fs-4 d-block mb-1"></i>No promotional coupons created yet.
                    </td>
                  </tr>
                ) : (
                  coupons.map(c => (
                    <tr key={c.id}>
                      <td className="fw-bold">#{c.id}</td>
                      <td>
                        <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2.5 py-1.5 font-monospace fw-bold fs-6">
                          {c.code}
                        </span>
                      </td>
                      <td className="fw-semibold">
                        {c.discount_type === 'PERCENTAGE' ? `${c.discount_value}% OFF` : `${c.currency === 'USD' ? '$' : '₹'}${c.discount_value} FLAT`}
                      </td>
                      <td>
                        <span className="badge bg-secondary bg-opacity-10 text-secondary border px-2 py-1">
                          {c.currency || 'INR'}
                        </span>
                      </td>
                      <td className="text-muted">
                        {c.min_order_value > 0 ? `${c.currency === 'USD' ? '$' : '₹'}${c.min_order_value}` : 'None'}
                      </td>
                      <td>
                        <span className="fw-bold text-dark">{c.current_uses || 0}</span> / {c.max_uses}
                      </td>
                      <td className="text-muted">
                        {c.valid_until ? new Date(c.valid_until).toLocaleDateString() : 'No Expiry'}
                      </td>
                      <td>
                        {c.is_active ? (
                          <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2.5 py-1 rounded-pill">Active</span>
                        ) : (
                          <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-2.5 py-1 rounded-pill">Inactive</span>
                        )}
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <button
                            className={`btn btn-sm ${c.is_active ? 'btn-outline-secondary' : 'btn-outline-success'} rounded-pill px-2.5 py-1`}
                            onClick={() => handleToggleStatus(c)}
                          >
                            {c.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button className="btn btn-sm btn-outline-danger rounded-pill px-2 py-1" onClick={() => handleDelete(c.id, c.code)}>
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
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
                <h5 className="modal-title fw-bold">Create Admission Coupon</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleCreate}>
                <div className="modal-body py-3">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Coupon Code <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control text-uppercase font-monospace fw-bold"
                      placeholder="e.g. SUMMER50, WELCOME1000"
                      value={form.code}
                      onChange={e => setForm({ ...form, code: e.target.value })}
                      required
                    />
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Discount Type</label>
                      <select className="form-select" value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value })}>
                        <option value="PERCENTAGE">Percentage (%)</option>
                        <option value="FLAT">Flat Amount (Fixed)</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Discount Amount / % <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="e.g. 15 or 2000"
                        value={form.discount_value}
                        onChange={e => setForm({ ...form, discount_value: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Target Currency</label>
                      <select className="form-select" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Min Order / Course Fee</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="0 for no minimum"
                        value={form.min_order_value}
                        onChange={e => setForm({ ...form, min_order_value: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Expiry Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.valid_until}
                        onChange={e => setForm({ ...form, valid_until: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Max Redemptions</label>
                      <input
                        type="number"
                        className="form-control"
                        value={form.max_uses}
                        onChange={e => setForm({ ...form, max_uses: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary rounded-pill" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4" disabled={submitting}>
                    {submitting ? 'Creating...' : 'Create Coupon'}
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

export default Coupons;
