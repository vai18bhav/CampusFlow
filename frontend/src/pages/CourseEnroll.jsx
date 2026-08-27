import React, { useState, useEffect } from 'react';
import api from '../services/api';

const STATUS_CONFIG = {
  PENDING:  { color: '#f59e0b', bg: '#fef3c7', icon: '⏳', label: 'Pending Approval' },
  APPROVED: { color: '#10b981', bg: '#d1fae5', icon: '✅', label: 'Approved & Enrolled' },
  REJECTED: { color: '#ef4444', bg: '#fee2e2', icon: '❌', label: 'Rejected' },
  Sent: { color: '#6b7280', bg: '#f3f4f6', icon: '✉️', label: 'Sent' },
  Opened: { color: '#3b82f6', bg: '#dbeafe', icon: '📖', label: 'Opened' },
  'In Progress': { color: '#8b5cf6', bg: '#f3e8ff', icon: '✍️', label: 'In Progress' },
  Submitted: { color: '#f59e0b', bg: '#fef3c7', icon: '⏳', label: 'Submitted' },
  Approved: { color: '#10b981', bg: '#d1fae5', icon: '✅', label: 'Approved' },
  Rejected: { color: '#ef4444', bg: '#fee2e2', icon: '❌', label: 'Rejected' }
};

const PAYMENT_PLANS = [
  { id: 'FULL', label: '💳 Full Payment (100% Upfront)', split: [1.0], desc: 'Pay full course fee on approval. Zero pending balance.' },
  { id: '2_INSTALLMENTS', label: '📦 2 Installments (50% + 50%)', split: [0.5, 0.5], desc: '50% payable upfront on approval, 50% due in 30 days.' },
  { id: '3_INSTALLMENTS', label: '📦 3 Installments (40% + 30% + 30%)', split: [0.4, 0.3, 0.3], desc: '40% payable upfront, 30% in 30 days, 30% in 60 days.' },
  { id: '4_INSTALLMENTS', label: '📦 4 Installments (25% × 4)', split: [0.25, 0.25, 0.25, 0.25], desc: '25% payable upfront, remaining split across 3 months.' },
];

export default function CourseEnroll() {
  const [courses, setCourses] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('FULL');
  const [message, setMessage] = useState('');

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, rRes] = await Promise.all([
        api.get('/courses'),
        api.get('/enrollments')
      ]);
      setCourses(cRes.data?.courses || []);
      setMyRequests(rRes.data?.requests || []);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    const loadAndCheckQuery = async () => {
      await fetchData();
      const params = new URLSearchParams(window.location.search);
      const reqId = params.get('request_id');
      if (reqId) {
        try {
          const reqRes = await api.get('/enrollments');
          const matched = reqRes.data?.requests?.find(r => String(r.id) === String(reqId));
          if (matched && (matched.status === 'Sent' || matched.status === 'Opened' || matched.status === 'In Progress')) {
            if (matched.status === 'Sent') {
              await api.patch(`/enrollments/${reqId}/status`, { status: 'Opened' });
            }
            const courseRes = await api.get('/courses');
            const matchedCourse = courseRes.data?.courses?.find(c => c.id === matched.course_id);
            if (matchedCourse) {
              handleOpenEnrollModal(matchedCourse);
              setSelectedCurrency(matched.currency || 'INR');
              // Mark request in progress
              api.patch(`/enrollments/${reqId}/status`, { status: 'In Progress' }).catch(() => {});
            }
          }
        } catch (err) {
          console.error('Failed to parse admission link parameters', err);
        }
      }
    };
    loadAndCheckQuery();
  }, []);

  const getRequestStatus = (courseId) => myRequests.find(r => r.course_id === courseId);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState(null);
  const [verifyingCoupon, setVerifyingCoupon] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('INR');

  const calculateMilestones = (courseFee, planId, coupon) => {
    let fee = Math.round(parseFloat(courseFee || 0));
    if (coupon && coupon.discount_amount) {
      fee = Math.max(0, fee - coupon.discount_amount);
    }
    const plan = PAYMENT_PLANS.find(p => p.id === planId) || PAYMENT_PLANS[0];
    const upfront = Math.round(fee * plan.split[0]);
    return {
      fee,
      upfront,
      installmentsCount: plan.split.length,
      remaining: Math.max(0, fee - upfront)
    };
  };

  const handleOpenEnrollModal = (course) => {
    setShowModal(course);
    setSelectedPlan('FULL');
    setMessage('');
    setCouponCode('');
    setAppliedCoupon(null);
    setCouponError(null);
    setSelectedCurrency('INR');
  };

  const handleVerifyCoupon = async () => {
    if (!couponCode.trim()) return;
    setVerifyingCoupon(true);
    setCouponError(null);
    try {
      const originalFee = Math.round(parseFloat(showModal.fee_amount || 0));
      const res = await api.post('/coupons/validate', {
        code: couponCode,
        amount: originalFee,
        currency: selectedCurrency
      });
      setAppliedCoupon(res.data?.data || null);
      showToast('✅ Coupon applied successfully!');
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err.response?.data?.message || err.message || 'Invalid coupon');
      showToast('❌ Coupon verification failed.', 'error');
    }
    setVerifyingCoupon(false);
  };

  const handleEnrollSubmit = async (e) => {
    e.preventDefault();
    if (!showModal) return;

    const { upfront, installmentsCount } = calculateMilestones(showModal.fee_amount, selectedPlan, appliedCoupon);

    setSubmitting(showModal.id);
    try {
      const params = new URLSearchParams(window.location.search);
      const reqId = params.get('request_id');

      if (reqId) {
        await api.patch(`/enrollments/${reqId}/status`, {
          status: 'Submitted',
          payment_plan: selectedPlan,
          installments_count: installmentsCount,
          coupon_code: appliedCoupon ? appliedCoupon.code : null,
          currency: selectedCurrency,
          message: message
        });
      } else {
        await api.post('/enrollments', {
          course_id: showModal.id,
          message,
          payment_plan: selectedPlan,
          installments_count: installmentsCount,
          coupon_code: appliedCoupon ? appliedCoupon.code : null,
          currency: selectedCurrency,
          status: 'Submitted'
        });
      }
      showToast(`✅ Enrollment request submitted successfully! Admissions will review and process your request.`);
      setShowModal(null);
      setMessage('');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to submit request', 'error');
    }
    setSubmitting(null);
  };

  const filtered = courses.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.category?.toLowerCase().includes(search.toLowerCase()) ||
    c.code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="cf-page-enter" style={{ padding: '1rem 0' }}>
      {toast && (
        <div style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', padding: '0.9rem 1.4rem', borderRadius: '12px', background: toast.type === 'error' ? '#ef4444' : '#10b981', color: '#fff', fontWeight: 700, zIndex: 9999, boxShadow: '0 8px 30px rgba(0,0,0,0.3)', maxWidth: '440px', lineHeight: 1.4 }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="cf-hero-welcome d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div className="cf-hero-welcome-shapes">
          <div className="cf-shape-dot cf-shape-dot-1"></div>
          <div className="cf-shape-dot cf-shape-dot-2"></div>
        </div>

        <div className="position-relative z-1">
          <div className="d-flex align-items-center gap-2 mb-2">
            <span className="badge bg-warning bg-opacity-20 text-warning border border-warning border-opacity-30 px-3 py-1 rounded-pill">
              📚 FLEXIBLE INSTALLMENT ENROLLMENT
            </span>
          </div>
          <h3 className="fw-extrabold text-white mb-1">Course Catalog & Admission Hub</h3>
          <p className="text-white-50 mb-0" style={{ maxWidth: '600px' }}>
            Choose your specialization, select full payment or a flexible 2/3/4 installment plan, and submit your enrollment application directly.
          </p>
        </div>
      </div>

      {/* My Submitted Requests Summary Banner */}
      {myRequests.length > 0 && (
        <div className="cf-card mb-4 p-3.5">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="fw-bold mb-0"><i className="bi bi-clock-history me-1.5 text-primary"></i>My Recent Enrollment Requests</h6>
            <span className="badge bg-primary bg-opacity-15 text-primary rounded-pill px-2.5">{myRequests.length} Total</span>
          </div>
          <div className="d-flex flex-column gap-2">
            {myRequests.map(req => {
              const st = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
              return (
                <div key={req.id} className="p-2.5 rounded-3 d-flex justify-content-between align-items-center flex-wrap gap-2" style={{ background: 'var(--cf-input-bg, #f8fafc)', border: '1px solid var(--cf-border, #e2e8f0)' }}>
                  <div>
                    <strong style={{ color: 'var(--cf-text-main)' }}>{req.course_name}</strong>
                    <div className="small text-muted mt-0.5">
                      📅 Requested: {new Date(req.created_at).toLocaleDateString('en-IN')}
                      {req.payment_plan && req.payment_plan !== 'FULL' ? (
                        <span className="ms-2 badge bg-info bg-opacity-15 text-info border border-info border-opacity-25 px-2 py-0.5 rounded-pill">
                          📦 {req.payment_plan.replace('_', ' ')}
                        </span>
                      ) : (
                        <span className="ms-2 badge bg-success bg-opacity-15 text-success border border-success border-opacity-25 px-2 py-0.5 rounded-pill">
                          💳 Full Payment
                        </span>
                      )}
                      {req.batch_name && <span className="ms-2 text-success fw-bold">→ Assigned to: {req.batch_name}</span>}
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge px-3 py-1.5 rounded-pill fw-bold" style={{ background: st.bg, color: st.color }}>
                      {st.icon} {st.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <h5 className="fw-bold mb-0">Browse All Available Courses</h5>
        <div style={{ minWidth: '260px' }}>
          <input
            type="text"
            className="form-control rounded-pill"
            placeholder="🔍 Search courses by name, category, or code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Course Grid */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-warning" role="status"></div>
          <div className="mt-2 text-muted fw-semibold">Loading courses database...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="cf-card text-center py-5 text-muted">No courses matched your query.</div>
      ) : (
        <div className="row g-3">
          {filtered.map(c => {
            const req = getRequestStatus(c.id);
            return (
              <div key={c.id} className="col-md-6 col-lg-4">
                <div className="cf-card h-100 d-flex flex-column p-4 transition-card shadow-sm border">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2.5 py-1 text-uppercase font-monospace small">
                      {c.code || 'CRS'}
                    </span>
                    <span className="badge bg-secondary bg-opacity-10 text-dark border font-monospace px-2.5 py-1 small">
                      {c.duration_weeks || 12} Weeks
                    </span>
                  </div>

                  <h5 className="fw-extrabold text-dark mb-2 text-truncate-2" style={{ fontSize: '1.05rem', lineHeight: 1.3 }}>{c.name}</h5>
                  <p className="text-muted small mb-3 flex-grow-1 text-truncate-3" style={{ fontSize: '0.82rem', lineHeight: 1.4 }}>
                    {c.description || 'Comprehensive specialization course focused on industry readiness, hands-on lab sessions, and capstone project assignments.'}
                  </p>

                  <div className="d-flex justify-content-between align-items-center pt-3 border-top mt-auto">
                    <div>
                      <div className="text-muted small font-monospace lh-1">TUITION FEE</div>
                      <div className="fw-extrabold text-dark mt-1" style={{ fontSize: '1.25rem' }}>
                        ₹ {parseFloat(c.fee_amount || 0).toLocaleString()}
                      </div>
                    </div>

                    {req ? (
                      <span className="badge px-3 py-2 rounded-pill fw-bold" style={{ background: (STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING).bg, color: (STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING).color }}>
                        {(STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING).icon} {(STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING).label}
                      </span>
                    ) : (
                      <button className="btn btn-warning text-dark fw-bold rounded-pill px-4" onClick={() => handleOpenEnrollModal(c)}>
                        Apply Now 🚀
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: ENROLLMENT & INSTALLMENT PLAN SELECTOR ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '1rem' }}>
          <div className="cf-card" style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <div>
                <h5 className="fw-bold mb-0">🎓 Course Enrollment & Plan</h5>
                <span className="small text-muted">{showModal.name} ({showModal.code})</span>
              </div>
              <button className="btn-close" onClick={() => setShowModal(null)}></button>
            </div>

            <form onSubmit={handleEnrollSubmit} className="d-flex flex-column gap-3">
              {/* Currency & Coupon Fields */}
              <div className="row g-2">
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted text-uppercase">Currency *</label>
                  <select
                    className="form-select"
                    value={selectedCurrency}
                    onChange={(e) => {
                      setSelectedCurrency(e.target.value);
                      setAppliedCoupon(null);
                      setCouponCode('');
                      setCouponError(null);
                    }}
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted text-uppercase">Coupon Code</label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. SAVE20"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-warning"
                      onClick={handleVerifyCoupon}
                      disabled={verifyingCoupon || !couponCode}
                    >
                      {verifyingCoupon ? '...' : 'Apply'}
                    </button>
                  </div>
                </div>
              </div>
              {couponError && <div className="text-danger small mt-0.5">❌ {couponError}</div>}
              {appliedCoupon && (
                <div className="text-success small mt-0.5 fw-bold">
                  ✅ Coupon applied! Discount: {selectedCurrency === 'INR' ? '₹' : '$'}{appliedCoupon.discount_amount}
                </div>
              )}

              {/* Fee Breakdown */}
              <div className="p-3 rounded-3" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.1), rgba(139,92,246,0.1))', border: '1.5px solid rgba(249,115,22,0.2)' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted small fw-bold">Total Course Fee:</span>
                  <strong className="text-warning fs-5">
                    {selectedCurrency === 'INR' ? '₹' : '$'} {Math.round(parseFloat(showModal.fee_amount || 0)).toLocaleString('en-IN')}
                    {appliedCoupon && (
                      <span className="text-muted small fw-normal ms-1.5" style={{ textDecoration: 'line-through' }}>
                        {selectedCurrency === 'INR' ? '₹' : '$'}{Math.round(parseFloat(showModal.fee_amount || 0))}
                      </span>
                    )}
                  </strong>
                </div>
                {appliedCoupon && (
                  <div className="d-flex justify-content-between align-items-center mt-1.5">
                    <span className="text-muted small fw-bold">Discount Applied:</span>
                    <strong className="text-danger fs-6">- {selectedCurrency === 'INR' ? '₹' : '$'} {appliedCoupon.discount_amount}</strong>
                  </div>
                )}
              </div>

              {/* Installment Plan Radio Selection */}
              <div>
                <label className="form-label small fw-bold text-muted text-uppercase" style={{ letterSpacing: '0.5px' }}>
                  Select Payment / Installment Plan *
                </label>
                <div className="d-flex flex-column gap-2">
                  {PAYMENT_PLANS.map(plan => {
                    const { upfront, remaining, installmentsCount } = calculateMilestones(showModal.fee_amount, plan.id, appliedCoupon);
                    const isSelected = selectedPlan === plan.id;

                    return (
                      <label
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id)}
                        style={{
                          padding: '0.85rem 1rem',
                          borderRadius: '12px',
                          border: `1.5px solid ${isSelected ? '#f97316' : 'var(--cf-border, #cbd5e1)'}`,
                          background: isSelected ? 'rgba(249,115,22,0.06)' : 'var(--cf-input-bg, #f8fafc)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.75rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <input
                          type="radio"
                          name="payment_plan"
                          checked={isSelected}
                          onChange={() => setSelectedPlan(plan.id)}
                          style={{ marginTop: '0.2rem', accentColor: '#f97316' }}
                        />
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-center">
                            <strong style={{ color: 'var(--cf-text-main)', fontSize: '0.92rem' }}>{plan.label}</strong>
                            <span className="badge bg-success rounded-pill small">
                              Upfront: {selectedCurrency === 'INR' ? '₹' : '$'}{upfront.toLocaleString()}
                            </span>
                          </div>
                          <p className="text-muted small mb-0 mt-1" style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
                            {plan.desc}
                          </p>
                          {remaining > 0 && (
                            <div className="text-primary small fw-bold mt-1" style={{ fontSize: '0.78rem' }}>
                              🗓️ Remaining {selectedCurrency === 'INR' ? '₹' : '$'}{remaining.toLocaleString()} split across {installmentsCount - 1} upcoming milestone(s).
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Message to Admission Committee */}
              <div>
                <label className="form-label small fw-bold text-muted">Note to Admissions Committee (Optional)</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Please enroll me in the Morning batch..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '0.88rem' }}
                ></textarea>
              </div>

              {/* Action Buttons */}
              <div className="d-flex gap-2 justify-content-end mt-2 pt-2 border-top">
                <button type="button" className="btn btn-outline-secondary px-3" onClick={() => setShowModal(null)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting === showModal.id}
                  className="btn btn-warning px-4 fw-bold text-dark"
                >
                  {submitting === showModal.id ? 'Submitting...' : 'Confirm & Request Enrollment 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
