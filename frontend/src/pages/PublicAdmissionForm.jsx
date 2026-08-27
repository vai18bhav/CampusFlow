import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const PublicAdmissionForm = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [linkInfo, setLinkInfo] = useState(null);
  const [linkError, setLinkError] = useState('');
  const [linkLoading, setLinkLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [courses, setCourses] = useState([]);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponResult, setCouponResult] = useState(null);
  const [couponError, setCouponError] = useState('');

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', dob: '', gender: 'MALE',
    address: '', course_id: '', currency: 'INR', message: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const loadLink = async () => {
      try {
        const res = await api.get(`/admission-links/${token}`);
        if (res.success) {
          const l = res.data.link;
          setLinkInfo(l);
          setForm(f => ({
            ...f,
            course_id: l.course_id ? String(l.course_id) : f.course_id,
            currency: l.currency && l.currency !== 'ANY' ? l.currency : 'INR'
          }));
        }
      } catch (err) {
        setLinkError(typeof err === 'string' ? err : 'This admission link is invalid or has expired.');
      } finally {
        setLinkLoading(false);
      }
    };

    api.get('/courses?status=active').then(r => {
      if (r.success) setCourses(r.data.courses || []);
    }).catch(() => {});

    loadLink();
  }, [token]);

  const selectedCourse = courses.find(c => String(c.id) === String(form.course_id)) || (linkInfo?.course_id ? { fee_amount: linkInfo.fee_amount, name: linkInfo.course_name } : null);
  const courseFee = parseFloat(selectedCourse?.fee_amount || 0);
  const discountAmount = couponResult?.discount_amount || 0;
  const netPayable = Math.max(0, courseFee - discountAmount);

  const set = (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    setErrors(e => ({ ...e, [field]: undefined }));
  };

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) { setCouponError('Enter a coupon code'); return; }
    if (!courseFee) { setCouponError('Select a course first to apply coupon'); return; }

    setCouponLoading(true); setCouponError(''); setCouponResult(null);
    try {
      const res = await api.post('/coupons/validate', {
        code: couponCode.trim(),
        amount: courseFee,
        currency: form.currency
      });
      if (res.success) {
        setCouponResult(res.data);
      }
    } catch (err) {
      setCouponError(typeof err === 'string' ? err : 'Invalid coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCouponResult(null); setCouponError(''); setCouponCode('');
  };

  const validate = () => {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = 'Full name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Invalid email format';
    if (!form.phone.trim()) errs.phone = 'Phone is required';
    else if (!/^[\+\d\s\-\(\)]{7,20}$/.test(form.phone.trim())) errs.phone = 'Invalid phone format';
    if (!form.course_id && !linkInfo?.course_id) errs.course_id = 'Course selection is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    setServerError('');
    try {
      const payload = {
        ...form,
        coupon_code: couponResult ? couponCode.trim() : undefined
      };
      const res = await api.post(`/admission-links/${token}/submit`, payload);
      if (res.success) {
        setSubmitted(true);
      }
    } catch (err) {
      setServerError(typeof err === 'string' ? err : 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (linkLoading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3"></div>
          <p className="text-muted">Loading admission form...</p>
        </div>
      </div>
    );
  }

  if (linkError) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center p-4" style={{ maxWidth: 480 }}>
          <span className="display-3 d-block mb-3">⛔</span>
          <h4 className="fw-bold text-danger">Link Unavailable</h4>
          <p className="text-muted">{linkError}</p>
          <p className="small text-muted">Please contact the organization to request a new admission link.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center p-4" style={{ maxWidth: 500 }}>
          <span className="display-2 d-block mb-3">🎓</span>
          <h3 className="fw-bold text-success">Application Submitted!</h3>
          <p className="text-muted mb-2">Thank you for applying. Your application has been received and is under review.</p>
          <div className="alert alert-info border-0 rounded-3 mt-3 small text-start">
            <i className="bi bi-info-circle me-2"></i>
            <strong>Next Steps:</strong> Our admissions team will review your application and contact you at <strong>{form.email}</strong> once approved.
          </div>
        </div>
      </div>
    );
  }

  const currSymbol = form.currency === 'USD' ? '$' : '₹';

  return (
    <div className="min-vh-100 bg-light py-5">
      <div className="container" style={{ maxWidth: 640 }}>
        {/* Header */}
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center bg-primary text-white rounded-circle mb-3" style={{ width: 64, height: 64 }}>
            <i className="bi bi-mortarboard-fill fs-3"></i>
          </div>
          <h3 className="fw-bold text-dark">Student Admission Form</h3>
          <p className="text-muted small">CampusFlow Enterprise Training &amp; Admissions</p>
        </div>

        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body p-4">
            {serverError && (
              <div className="alert alert-danger alert-dismissible small" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>{serverError}
                <button type="button" className="btn-close" onClick={() => setServerError('')}></button>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Section 1: Personal Details */}
              <h6 className="fw-bold text-primary mb-3 small text-uppercase"><i className="bi bi-person me-2"></i>Personal Details</h6>
              <div className="row g-3 mb-4">
                <div className="col-12">
                  <label className="form-label small fw-semibold">Full Name <span className="text-danger">*</span></label>
                  <input type="text" className={`form-control ${errors.full_name ? 'is-invalid' : ''}`} placeholder="John Doe" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
                  {errors.full_name && <div className="invalid-feedback">{errors.full_name}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Email Address <span className="text-danger">*</span></label>
                  <input type="email" className={`form-control ${errors.email ? 'is-invalid' : ''}`} placeholder="student@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
                  {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Phone Number <span className="text-danger">*</span></label>
                  <input type="tel" className={`form-control ${errors.phone ? 'is-invalid' : ''}`} placeholder="+91 98765 43210" value={form.phone} onChange={e => set('phone', e.target.value)} />
                  {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Date of Birth</label>
                  <input type="date" className="form-control" value={form.dob} onChange={e => set('dob', e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Gender</label>
                  <select className="form-select" value={form.gender} onChange={e => set('gender', e.target.value)}>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other / Prefer not to say</option>
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">Address</label>
                  <textarea className="form-control" rows={2} placeholder="Street, City, State, PIN" value={form.address} onChange={e => set('address', e.target.value)} />
                </div>
              </div>

              {/* Section 2: Course & Currency */}
              <h6 className="fw-bold text-primary mb-3 small text-uppercase"><i className="bi bi-journal-bookmark me-2"></i>Course &amp; Currency</h6>
              <div className="row g-3 mb-4">
                <div className="col-md-8">
                  <label className="form-label small fw-semibold">Course <span className="text-danger">*</span></label>
                  {linkInfo?.course_id ? (
                    <div className="form-control bg-light fw-bold text-dark">
                      {linkInfo.course_name}
                    </div>
                  ) : (
                    <select className={`form-select ${errors.course_id ? 'is-invalid' : ''}`} value={form.course_id} onChange={e => set('course_id', e.target.value)}>
                      <option value="">— Select Course —</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                    </select>
                  )}
                  {errors.course_id && <div className="invalid-feedback">{errors.course_id}</div>}
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Currency</label>
                  <select
                    className="form-select"
                    value={form.currency}
                    onChange={e => { set('currency', e.target.value); setCouponResult(null); }}
                    disabled={linkInfo?.currency && linkInfo.currency !== 'ANY'}
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              {/* Section 3: Coupon Code */}
              <h6 className="fw-bold text-primary mb-3 small text-uppercase"><i className="bi bi-ticket-perforated me-2"></i>Coupon Code</h6>
              <div className="row g-3 mb-4">
                <div className="col-12">
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control text-uppercase"
                      placeholder="ENTER COUPON CODE"
                      value={couponCode}
                      onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null); setCouponError(''); }}
                      disabled={!!couponResult}
                    />
                    {couponResult ? (
                      <button className="btn btn-outline-danger" type="button" onClick={removeCoupon}>
                        <i className="bi bi-x-lg"></i> Remove
                      </button>
                    ) : (
                      <button className="btn btn-outline-primary fw-semibold" type="button" onClick={handleValidateCoupon} disabled={couponLoading || !courseFee}>
                        {couponLoading ? <span className="spinner-border spinner-border-sm"></span> : 'Apply Coupon'}
                      </button>
                    )}
                  </div>
                  {couponError && <div className="text-danger small mt-1"><i className="bi bi-exclamation-circle me-1"></i>{couponError}</div>}
                  {couponResult && <div className="text-success small mt-1"><i className="bi bi-check-circle-fill me-1"></i>Coupon applied! Discount: {currSymbol}{discountAmount.toLocaleString()}</div>}
                </div>

                {/* Summary Box */}
                {courseFee > 0 && (
                  <div className="col-12">
                    <div className="card border-0 bg-light rounded-3 p-3">
                      <div className="row text-center g-2">
                        <div className="col-4">
                          <div className="text-muted small">Course Fee</div>
                          <div className="fw-bold">{currSymbol}{courseFee.toLocaleString()}</div>
                        </div>
                        <div className="col-4">
                          <div className="text-muted small">Discount</div>
                          <div className="fw-bold text-danger">-{currSymbol}{discountAmount.toLocaleString()}</div>
                        </div>
                        <div className="col-4">
                          <div className="text-muted small">Est. Payable</div>
                          <div className="fw-bold text-success fs-6">{currSymbol}{netPayable.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Remarks */}
              <div className="mb-4">
                <label className="form-label small fw-semibold">Additional Comments / Remarks (optional)</label>
                <textarea className="form-control" rows={2} placeholder="Any specific requirements..." value={form.message} onChange={e => set('message', e.target.value)} />
              </div>

              <button type="submit" className="btn btn-primary w-100 rounded-pill py-2.5 fw-bold shadow-sm" disabled={submitting}>
                {submitting ? (
                  <><span className="spinner-border spinner-border-sm me-2"></span>Submitting Admission Form...</>
                ) : (
                  <><i className="bi bi-send-fill me-2"></i>Submit Admission Application</>
                )}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-muted small mt-4">
          CampusFlow Enterprise Training &amp; Admission Portal
        </p>
      </div>
    </div>
  );
};

export default PublicAdmissionForm;
