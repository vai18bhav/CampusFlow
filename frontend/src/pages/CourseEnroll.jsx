import React, { useState, useEffect } from 'react';
import api from '../services/api';

const STATUS_CONFIG = {
  PENDING:  { color: '#f59e0b', bg: '#fef3c7', icon: '⏳', label: 'Pending Approval' },
  APPROVED: { color: '#10b981', bg: '#d1fae5', icon: '✅', label: 'Approved & Enrolled' },
  REJECTED: { color: '#ef4444', bg: '#fee2e2', icon: '❌', label: 'Rejected' }
};

const PAYMENT_PLANS = [
  { id: 'FULL', label: '💳 Full Payment (100% Upfront)', split: [1.0], desc: 'Deduct full course fee on approval. Zero pending balance.' },
  { id: '2_INSTALLMENTS', label: '📦 2 Installments (50% + 50%)', split: [0.5, 0.5], desc: '50% deducted upfront on approval, 50% due in 30 days.' },
  { id: '3_INSTALLMENTS', label: '📦 3 Installments (40% + 30% + 30%)', split: [0.4, 0.3, 0.3], desc: '40% deducted upfront, 30% in 30 days, 30% in 60 days.' },
  { id: '4_INSTALLMENTS', label: '📦 4 Installments (25% × 4)', split: [0.25, 0.25, 0.25, 0.25], desc: '25% deducted upfront, remaining split across 3 months.' },
];

export default function CourseEnroll() {
  const [courses, setCourses] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [wallet, setWallet] = useState(null);
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
      const [cRes, rRes, wRes] = await Promise.all([
        api.get('/courses'),
        api.get('/enrollments'),
        api.get('/wallet/my').catch(() => ({ data: { wallet: null } }))
      ]);
      setCourses(cRes.data?.courses || []);
      setMyRequests(rRes.data?.requests || []);
      setWallet(wRes.data?.wallet || null);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getRequestStatus = (courseId) => myRequests.find(r => r.course_id === courseId);
  const coinBalance = wallet?.coins_balance ?? 0;

  const calculateMilestones = (courseFee, planId) => {
    const fee = Math.round(parseFloat(courseFee || 0));
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
  };

  const handleEnrollSubmit = async (e) => {
    e.preventDefault();
    if (!showModal) return;

    const { upfront, installmentsCount } = calculateMilestones(showModal.fee_amount, selectedPlan);

    if (upfront > coinBalance) {
      showToast(`❌ Insufficient coins! You need at least ${upfront} 🪙 for the 1st installment, but you have ${coinBalance} 🪙.`, 'error');
      return;
    }

    setSubmitting(showModal.id);
    try {
      await api.post('/enrollments', {
        course_id: showModal.id,
        message,
        payment_plan: selectedPlan,
        installments_count: installmentsCount
      });
      showToast(`✅ Enrollment request sent with ${installmentsCount === 1 ? 'Full Payment' : `${installmentsCount} Installments`}! Admin will review and deduct ${upfront} 🪙 upfront on approval.`);
      setShowModal(null);
      setMessage('');
      fetchData();
    } catch (err) {
      showToast(err || 'Failed to submit request', 'error');
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

      {/* Header with Coin Wallet Banner */}
      <div className="cf-hero-welcome d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div className="cf-hero-welcome-shapes">
          <div className="cf-shape-dot cf-shape-dot-1"></div>
          <div className="cf-shape-dot cf-shape-dot-2"></div>
        </div>

        <div className="position-relative z-1">
          <div className="d-flex align-items-center gap-2 mb-2">
            <span className="badge bg-warning bg-opacity-20 text-warning border border-warning border-opacity-30 px-3 py-1 rounded-pill">
              🪙 FLEXIBLE INSTALLMENT ENROLLMENT
            </span>
          </div>
          <h3 className="fw-extrabold text-white mb-1">Course Catalog & Admission Hub</h3>
          <p className="text-white-50 mb-0" style={{ maxWidth: '600px' }}>
            Choose your specialization, select full payment or a flexible 2/3/4 installment plan, and enroll using your CampusFlow Coin Wallet.
          </p>
        </div>

        {/* Student Wallet Coin Balance */}
        <div className="d-flex align-items-center gap-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-4 px-4 py-2.5 position-relative z-1">
          <span style={{ fontSize: '2.2rem' }}>🪙</span>
          <div>
            <div className="fw-extrabold text-warning fs-4 lh-1">{coinBalance.toLocaleString('en-IN')}</div>
            <div className="text-white-50 small fw-bold mt-0.5">Available Coins</div>
          </div>
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
            placeholder="🔍 Search course name, code, category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-control fw-semibold"
          />
        </div>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="cf-card text-center py-5">
          <div className="spinner-border text-primary mb-3" role="status"></div>
          <div className="text-muted fw-semibold">Loading available course catalog...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="cf-card text-center py-5">
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📚</div>
          <h4 className="fw-bold mb-2">No Courses Found</h4>
          <p className="text-muted">Try adjusting your search criteria or check back later.</p>
        </div>
      ) : (
        <div className="row g-4">
          {filtered.map(course => {
            const req = getRequestStatus(course.id);
            const fee = Math.round(parseFloat(course.fee_amount || 0));
            const hasSufficientCoins = coinBalance >= fee || coinBalance >= Math.round(fee * 0.25);

            return (
              <div key={course.id} className="col-12 col-md-6 col-xl-4">
                <div className="cf-card h-100 p-0 overflow-hidden shadow-sm d-flex flex-column">
                  {/* Card Header Top */}
                  <div style={{ padding: '1.25rem', background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(139,92,246,0.08))', borderBottom: '1px solid var(--cf-border, #e2e8f0)' }}>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="badge bg-primary bg-opacity-15 text-primary border border-primary border-opacity-25 px-2.5 py-1 rounded-pill small fw-bold">
                        {course.category || 'Professional'}
                      </span>
                      <span className="badge bg-warning bg-opacity-20 text-dark border border-warning border-opacity-30 px-3 py-1 rounded-pill fw-bold">
                        🪙 {fee.toLocaleString('en-IN')} Coins
                      </span>
                    </div>
                    <h5 className="fw-extrabold mb-1" style={{ color: 'var(--cf-text-main)' }}>{course.name}</h5>
                    <span className="small text-muted font-monospace">{course.code} • {course.duration_weeks || 12} Weeks</span>
                  </div>

                  {/* Course Details */}
                  <div className="p-3.5 flex-grow-1 d-flex flex-column justify-content-between">
                    <p className="text-muted small mb-3" style={{ lineHeight: 1.6 }}>
                      {course.description || 'Comprehensive industry-aligned curriculum with live coding labs, weekly assignments, and mock interview preparations.'}
                    </p>

                    {/* Installment Badge Helper */}
                    <div className="p-2.5 rounded-3 mb-3" style={{ background: 'var(--cf-input-bg, #f8fafc)', border: '1px dashed var(--cf-border, #cbd5e1)' }}>
                      <div className="small fw-bold text-success d-flex align-items-center gap-1">
                        <i className="bi bi-check-circle-fill"></i> Installment Plans Available
                      </div>
                      <div className="small text-muted mt-0.5" style={{ fontSize: '0.78rem' }}>
                        Pay full or split into 2, 3, or 4 milestones (as low as <strong>{Math.round(fee * 0.25)} 🪙/mo</strong>)
                      </div>
                    </div>

                    {/* Action Button */}
                    <div>
                      {req ? (
                        <div className="p-2.5 rounded-3 text-center" style={{ background: STATUS_CONFIG[req.status]?.bg, color: STATUS_CONFIG[req.status]?.color }}>
                          <span className="fw-bold small">{STATUS_CONFIG[req.status]?.icon} {STATUS_CONFIG[req.status]?.label}</span>
                        </div>
                      ) : (
                        <button
                          className="btn btn-primary w-100 rounded-pill fw-bold py-2 shadow-sm"
                          onClick={() => handleOpenEnrollModal(course)}
                        >
                          🚀 Enroll with Coins / Installments
                        </button>
                      )}
                    </div>
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
              {/* Fee & Wallet Breakdown */}
              <div className="p-3 rounded-3" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.1), rgba(139,92,246,0.1))', border: '1.5px solid rgba(249,115,22,0.2)' }}>
                <div className="d-flex justify-content-between align-items-center mb-1.5">
                  <span className="text-muted small fw-bold">Total Course Fee:</span>
                  <strong className="text-warning fs-5">🪙 {Math.round(parseFloat(showModal.fee_amount || 0)).toLocaleString('en-IN')} Coins</strong>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted small fw-bold">Your Wallet Balance:</span>
                  <strong className="text-success fs-6">🪙 {coinBalance.toLocaleString('en-IN')} Coins</strong>
                </div>
              </div>

              {/* Installment Plan Radio Selection */}
              <div>
                <label className="form-label small fw-bold text-muted text-uppercase" style={{ letterSpacing: '0.5px' }}>
                  Select Payment / Installment Plan *
                </label>
                <div className="d-flex flex-column gap-2">
                  {PAYMENT_PLANS.map(plan => {
                    const { upfront, remaining, installmentsCount } = calculateMilestones(showModal.fee_amount, plan.id);
                    const isSelected = selectedPlan === plan.id;
                    const canAffordUpfront = coinBalance >= upfront;

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
                            <span className={`badge ${canAffordUpfront ? 'bg-success' : 'bg-danger'} rounded-pill small`}>
                              Upfront: {upfront} 🪙
                            </span>
                          </div>
                          <p className="text-muted small mb-0 mt-1" style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
                            {plan.desc}
                          </p>
                          {remaining > 0 && (
                            <div className="text-primary small fw-bold mt-1" style={{ fontSize: '0.78rem' }}>
                              🗓️ Remaining {remaining} 🪙 split across {installmentsCount - 1} upcoming milestone(s).
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
