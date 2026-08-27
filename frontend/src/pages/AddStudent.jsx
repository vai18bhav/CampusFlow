import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const STEPS = [
  { id: 1, label: 'Personal Info', icon: 'bi-person-fill' },
  { id: 2, label: 'Course & Batch', icon: 'bi-mortarboard-fill' },
  { id: 3, label: 'Fees', icon: 'bi-receipt' },
  { id: 4, label: 'Instalments', icon: 'bi-calendar2-check' },
  { id: 5, label: 'Mock Credits', icon: 'bi-star-fill' },
  { id: 6, label: 'Account', icon: 'bi-shield-lock-fill' },
  { id: 7, label: 'Review', icon: 'bi-check2-circle' }
];

const initialForm = {
  // Personal
  full_name: '', email: '', phone: '', dob: '', gender: 'MALE', address: '',
  // Course & Batch
  course_id: '', batch_id: '', trainer_id: '',
  // Fees
  admission_date: new Date().toISOString().split('T')[0],
  currency: 'INR',
  total_fee: '',
  coupon_code: '',
  // Instalments
  installment_count: '1',
  // Mock Credits
  mock_interview_credits: '0',
  mock_credit_expiry: '',
  // Account
  password: ''
};

const AddStudent = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successData, setSuccessData] = useState(null);

  // Dropdown data
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [filteredBatches, setFilteredBatches] = useState([]);
  const [trainers, setTrainers] = useState([]);

  // Coupon
  const [couponResult, setCouponResult] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Computed
  const discountAmount = couponResult?.discount_amount || 0;
  const courseFee = parseFloat(form.total_fee || 0);
  const netPayable = Math.max(0, courseFee - discountAmount);
  const installmentAmt = form.installment_count > 0 ? (netPayable / parseInt(form.installment_count || 1, 10)).toFixed(2) : 0;

  // Guard: only Admin/Super Admin
  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
    return (
      <div className="alert alert-danger m-4">
        <i className="bi bi-shield-exclamation me-2"></i>
        You do not have permission to add students.
      </div>
    );
  }

  useEffect(() => {
    Promise.all([
      api.get('/courses?status=active'),
      api.get('/batches'),
      api.get('/users/trainers')
    ]).then(([resC, resB, resT]) => {
      if (resC.success) setCourses(resC.data.courses || []);
      if (resB.success) setBatches(resB.data.batches || []);
      if (resT.success) setTrainers(resT.data.trainers || []);
    }).catch(() => {});
  }, []);

  // Filter batches by selected course
  useEffect(() => {
    if (form.course_id) {
      const fb = batches.filter(b => String(b.course_id) === String(form.course_id) &&
        ['UPCOMING', 'ONGOING'].includes(b.status));
      setFilteredBatches(fb);
      setForm(f => ({ ...f, batch_id: '', trainer_id: '' }));
    } else {
      setFilteredBatches([]);
    }
  }, [form.course_id, batches]);

  // Auto-fill fee when course changes
  useEffect(() => {
    if (form.course_id) {
      const c = courses.find(x => String(x.id) === String(form.course_id));
      if (c) setForm(f => ({ ...f, total_fee: String(c.fee_amount) }));
    }
  }, [form.course_id, courses]);

  // Auto-fill trainer when batch changes
  useEffect(() => {
    if (form.batch_id) {
      const b = batches.find(x => String(x.id) === String(form.batch_id));
      if (b?.trainer_id) setForm(f => ({ ...f, trainer_id: String(b.trainer_id) }));
    }
  }, [form.batch_id, batches]);

  const set = (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    setErrors(e => ({ ...e, [field]: undefined }));
  };

  // ── Field-level validation per step ────────────────────────────────────────
  const validateStep = (s) => {
    const errs = {};
    if (s === 1) {
      if (!form.full_name.trim()) errs.full_name = 'Full name is required';
      if (!form.email.trim()) errs.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Invalid email format';
      if (!form.phone.trim()) errs.phone = 'Phone number is required';
      else if (!/^[\+\d\s\-\(\)]{7,20}$/.test(form.phone.trim())) errs.phone = 'Invalid phone format';
    }
    if (s === 2) {
      if (!form.course_id) errs.course_id = 'Please select a course';
      if (!form.batch_id) errs.batch_id = 'Please select a batch';
    }
    if (s === 3) {
      if (!form.total_fee || parseFloat(form.total_fee) <= 0) errs.total_fee = 'Course fee is required';
    }
    if (s === 6) {
      if (!form.password.trim()) errs.password = 'Password is required';
      else if (form.password.trim().length < 8) errs.password = 'Password must be at least 8 characters';
    }
    return errs;
  };

  const nextStep = () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setStep(s => Math.min(s + 1, STEPS.length));
    window.scrollTo(0, 0);
  };
  const prevStep = () => { setStep(s => Math.max(s - 1, 1)); window.scrollTo(0, 0); };

  const validateCoupon = async () => {
    if (!form.coupon_code.trim()) { setCouponError('Enter a coupon code first'); return; }
    setCouponLoading(true); setCouponError(''); setCouponResult(null);
    try {
      const res = await api.post('/coupons/validate', {
        code: form.coupon_code.trim(),
        amount: parseFloat(form.total_fee || 0),
        currency: form.currency
      });
      if (res.success) {
        setCouponResult(res.data);
      }
    } catch (err) {
      setCouponError(typeof err === 'string' ? err : 'Invalid coupon');
      setCouponResult(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => { setCouponResult(null); setCouponError(''); setForm(f => ({ ...f, coupon_code: '' })); };

  const handleSubmit = async () => {
    const errs = validateStep(6);
    if (Object.keys(errs).length > 0) { setErrors(errs); setStep(6); return; }
    setSubmitting(true);
    setServerError('');
    try {
      const payload = {
        ...form,
        total_fee: parseFloat(form.total_fee),
        mock_interview_credits: parseInt(form.mock_interview_credits || 0, 10),
        installment_count: parseInt(form.installment_count || 1, 10),
        coupon_code: couponResult ? form.coupon_code : undefined
      };
      const res = await api.post('/students', payload);
      if (res.success) {
        setSuccessData(res.data);
      }
    } catch (err) {
      setServerError(typeof err === 'string' ? err : 'Student creation failed');
      setStep(1);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Selected display helpers ───────────────────────────────────────────────
  const selectedCourse = courses.find(c => String(c.id) === String(form.course_id));
  const selectedBatch = batches.find(b => String(b.id) === String(form.batch_id));
  const selectedTrainer = trainers.find(t => String(t.trainer_id) === String(form.trainer_id));

  // ── Success screen ─────────────────────────────────────────────────────────
  if (successData) {
    return (
      <div className="cf-page-enter">
        <div className="text-center py-5">
          <div className="mb-4">
            <span className="display-1">🎉</span>
          </div>
          <h3 className="fw-bold text-success">Student Created Successfully!</h3>
          <p className="text-muted mb-4">The student account and admission have been confirmed.</p>
          <div className="card border-0 shadow-sm rounded-4 mx-auto" style={{ maxWidth: 500 }}>
            <div className="card-body p-4">
              <div className="row g-3 text-start">
                <div className="col-6"><span className="text-muted small">Roll Number</span><div className="fw-bold font-monospace">{successData.rollNumber}</div></div>
                <div className="col-6"><span className="text-muted small">Admission No.</span><div className="fw-bold">{successData.admissionNumber}</div></div>
                <div className="col-6"><span className="text-muted small">Invoice No.</span><div className="fw-bold">{successData.invoiceNumber}</div></div>
                <div className="col-6"><span className="text-muted small">Net Payable</span><div className="fw-bold text-success">₹{successData.netPayable?.toLocaleString()}</div></div>
                {successData.discountAmount > 0 && <div className="col-6"><span className="text-muted small">Discount</span><div className="fw-bold text-danger">-₹{successData.discountAmount?.toLocaleString()}</div></div>}
                <div className="col-6"><span className="text-muted small">Instalments</span><div className="fw-bold">{successData.installmentsCreated}</div></div>
                <div className="col-6"><span className="text-muted small">Mock Credits</span><div className="fw-bold">{successData.mockCredits}</div></div>
              </div>
            </div>
          </div>
          <div className="d-flex gap-3 justify-content-center mt-4">
            <button className="btn btn-outline-primary rounded-pill px-4" onClick={() => { setForm(initialForm); setCouponResult(null); setSuccessData(null); setStep(1); }}>
              <i className="bi bi-plus-circle me-2"></i>Add Another Student
            </button>
            <button className="btn btn-primary rounded-pill px-4" onClick={() => navigate('/students')}>
              <i className="bi bi-people-fill me-2"></i>View All Students
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cf-page-enter">
      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <button className="btn btn-light border rounded-pill px-3" onClick={() => navigate('/students')}>
          <i className="bi bi-arrow-left me-1"></i> Back
        </button>
        <div>
          <h3 className="fw-bold text-dark mb-0"><i className="bi bi-person-plus-fill text-primary me-2"></i>Add New Student</h3>
          <p className="text-muted small mb-0">Complete all sections to create a student account with admission</p>
        </div>
      </div>

      {serverError && (
        <div className="alert alert-danger alert-dismissible fade show rounded-3 mb-3" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>{serverError}
          <button type="button" className="btn-close" onClick={() => setServerError('')}></button>
        </div>
      )}

      {/* Step Progress Bar */}
      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body p-3">
          <div className="d-flex align-items-center justify-content-between overflow-auto gap-1">
            {STEPS.map((s, idx) => (
              <React.Fragment key={s.id}>
                <div
                  className={`d-flex flex-column align-items-center cursor-pointer flex-shrink-0 ${step === s.id ? 'text-primary' : step > s.id ? 'text-success' : 'text-muted'}`}
                  style={{ cursor: step > s.id ? 'pointer' : 'default', minWidth: 60 }}
                  onClick={() => step > s.id && setStep(s.id)}
                  title={s.label}
                >
                  <div className={`rounded-circle d-flex align-items-center justify-content-center mb-1 ${step === s.id ? 'bg-primary text-white' : step > s.id ? 'bg-success text-white' : 'bg-light text-muted border'}`}
                    style={{ width: 36, height: 36 }}>
                    {step > s.id ? <i className="bi bi-check-lg small"></i> : <i className={`${s.icon} small`}></i>}
                  </div>
                  <span className="text-center" style={{ fontSize: 10, lineHeight: 1.2 }}>{s.label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className="flex-grow-1" style={{ height: 2, background: step > s.id ? '#198754' : '#dee2e6', minWidth: 10 }}></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-4">

          {/* ── STEP 1: Personal Information ───────────────────────────────── */}
          {step === 1 && (
            <>
              <h5 className="fw-bold mb-4"><i className="bi bi-person-fill text-primary me-2"></i>Personal Information</h5>
              <div className="row g-3">
                <div className="col-md-6">
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
                  <textarea className="form-control" rows={2} placeholder="Street, City, State, ZIP" value={form.address} onChange={e => set('address', e.target.value)} />
                </div>
              </div>
            </>
          )}

          {/* ── STEP 2: Course & Batch ─────────────────────────────────────── */}
          {step === 2 && (
            <>
              <h5 className="fw-bold mb-4"><i className="bi bi-mortarboard-fill text-primary me-2"></i>Course & Batch</h5>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Course <span className="text-danger">*</span></label>
                  <select className={`form-select ${errors.course_id ? 'is-invalid' : ''}`} value={form.course_id} onChange={e => set('course_id', e.target.value)}>
                    <option value="">— Select Course —</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                  </select>
                  {errors.course_id && <div className="invalid-feedback">{errors.course_id}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Batch <span className="text-danger">*</span></label>
                  <select className={`form-select ${errors.batch_id ? 'is-invalid' : ''}`} value={form.batch_id} onChange={e => set('batch_id', e.target.value)} disabled={!form.course_id}>
                    <option value="">— Select Batch —</option>
                    {filteredBatches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.batch_code}) — {b.mode}</option>)}
                  </select>
                  {errors.batch_id && <div className="invalid-feedback">{errors.batch_id}</div>}
                  {form.course_id && filteredBatches.length === 0 && <div className="text-warning small mt-1"><i className="bi bi-exclamation-triangle me-1"></i>No available batches for this course</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Trainer</label>
                  <select className="form-select" value={form.trainer_id} onChange={e => set('trainer_id', e.target.value)}>
                    <option value="">— Auto-assigned from batch —</option>
                    {trainers.map(t => <option key={t.trainer_id} value={t.trainer_id}>{t.full_name}</option>)}
                  </select>
                </div>
                {selectedBatch && (
                  <div className="col-12">
                    <div className="alert alert-info border-0 rounded-3 py-2 px-3 small">
                      <i className="bi bi-info-circle me-2"></i>
                      <strong>{selectedBatch.name}</strong> — Mode: {selectedBatch.mode} | Timing: {selectedBatch.timing || 'TBD'} | Starts: {selectedBatch.start_date?.split('T')[0]}
                    </div>
                  </div>
                )}
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Admission Date</label>
                  <input type="date" className="form-control" value={form.admission_date} onChange={e => set('admission_date', e.target.value)} />
                </div>
              </div>
            </>
          )}

          {/* ── STEP 3: Admission & Fees ───────────────────────────────────── */}
          {step === 3 && (
            <>
              <h5 className="fw-bold mb-4"><i className="bi bi-receipt text-primary me-2"></i>Admission & Fees</h5>
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Currency</label>
                  <select className="form-select" value={form.currency} onChange={e => { set('currency', e.target.value); setCouponResult(null); }}>
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Total Course Fee <span className="text-danger">*</span></label>
                  <input type="number" className={`form-control ${errors.total_fee ? 'is-invalid' : ''}`} placeholder="50000" min="0" step="0.01" value={form.total_fee} onChange={e => { set('total_fee', e.target.value); setCouponResult(null); }} />
                  {errors.total_fee && <div className="invalid-feedback">{errors.total_fee}</div>}
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Coupon Code</label>
                  <div className="input-group">
                    <input type="text" className="form-control text-uppercase" placeholder="SAVE20" value={form.coupon_code} onChange={e => { set('coupon_code', e.target.value.toUpperCase()); setCouponResult(null); setCouponError(''); }} disabled={!!couponResult} />
                    {couponResult ? (
                      <button className="btn btn-outline-danger" type="button" onClick={removeCoupon}><i className="bi bi-x-lg"></i></button>
                    ) : (
                      <button className="btn btn-outline-primary" type="button" onClick={validateCoupon} disabled={couponLoading || !form.total_fee}>
                        {couponLoading ? <span className="spinner-border spinner-border-sm"></span> : 'Apply'}
                      </button>
                    )}
                  </div>
                  {couponError && <div className="text-danger small mt-1"><i className="bi bi-x-circle me-1"></i>{couponError}</div>}
                  {couponResult && <div className="text-success small mt-1"><i className="bi bi-check-circle me-1"></i>Coupon applied! Saving {couponResult.discount_type === 'PERCENTAGE' ? `${couponResult.discount_value}%` : `₹${couponResult.discount_value}`}</div>}
                </div>

                {/* Fee Summary */}
                <div className="col-12">
                  <div className="card border-0 bg-light rounded-3 p-3">
                    <div className="row g-2 text-center">
                      <div className="col-4">
                        <div className="text-muted small">Original Fee</div>
                        <div className="fw-bold">{form.currency === 'INR' ? '₹' : '$'}{courseFee.toLocaleString()}</div>
                      </div>
                      <div className="col-4">
                        <div className="text-muted small">Discount</div>
                        <div className="fw-bold text-danger">-{form.currency === 'INR' ? '₹' : '$'}{discountAmount.toLocaleString()}</div>
                      </div>
                      <div className="col-4">
                        <div className="text-muted small">Net Payable</div>
                        <div className="fw-bold text-success fs-5">{form.currency === 'INR' ? '₹' : '$'}{netPayable.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── STEP 4: Instalments ───────────────────────────────────────── */}
          {step === 4 && (
            <>
              <h5 className="fw-bold mb-4"><i className="bi bi-calendar2-check text-primary me-2"></i>Instalment Plan</h5>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Number of Instalments</label>
                  <select className="form-select" value={form.installment_count} onChange={e => set('installment_count', e.target.value)}>
                    {[1, 2, 3, 4, 6, 12].map(n => <option key={n} value={n}>{n} {n === 1 ? '(Full Payment)' : `Instalments`}</option>)}
                  </select>
                </div>
                <div className="col-12">
                  <div className="table-responsive">
                    <table className="table table-bordered table-sm rounded-3 overflow-hidden">
                      <thead className="table-light">
                        <tr>
                          <th>#</th>
                          <th>Amount ({form.currency === 'INR' ? '₹' : '$'})</th>
                          <th>Due Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: parseInt(form.installment_count || 1) }).map((_, i) => {
                          const d = new Date();
                          d.setDate(d.getDate() + i * 30);
                          const amt = i === parseInt(form.installment_count || 1) - 1
                            ? (netPayable - installmentAmt * (parseInt(form.installment_count || 1) - 1)).toFixed(2)
                            : installmentAmt;
                          return (
                            <tr key={i}>
                              <td className="fw-semibold">#{i + 1}</td>
                              <td>{parseFloat(amt).toLocaleString()}</td>
                              <td>{d.toISOString().split('T')[0]}</td>
                              <td><span className="badge bg-warning text-dark">Pending</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── STEP 5: Mock Credits ──────────────────────────────────────── */}
          {step === 5 && (
            <>
              <h5 className="fw-bold mb-4"><i className="bi bi-star-fill text-primary me-2"></i>Mock Interview Credits</h5>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Mock Interview Credits</label>
                  <input type="number" className="form-control" min="0" max="100" placeholder="e.g. 5" value={form.mock_interview_credits} onChange={e => set('mock_interview_credits', e.target.value)} />
                  <div className="form-text">Number of mock interview sessions the student can book.</div>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Credit Expiry Date</label>
                  <input type="date" className="form-control" value={form.mock_credit_expiry} onChange={e => set('mock_credit_expiry', e.target.value)} />
                  <div className="form-text">Leave blank for no expiry.</div>
                </div>
                {form.mock_interview_credits > 0 && (
                  <div className="col-12">
                    <div className="alert alert-success border-0 rounded-3 py-2 px-3">
                      <i className="bi bi-star-fill text-warning me-2"></i>
                      <strong>{form.mock_interview_credits}</strong> mock interview credits will be assigned.
                      {form.mock_credit_expiry && <span> Expires on <strong>{form.mock_credit_expiry}</strong>.</span>}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── STEP 6: Account Information ───────────────────────────────── */}
          {step === 6 && (
            <>
              <h5 className="fw-bold mb-4"><i className="bi bi-shield-lock-fill text-primary me-2"></i>Account Information</h5>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Password <span className="text-danger">*</span></label>
                  <input type="text" className={`form-control font-monospace ${errors.password ? 'is-invalid' : ''}`} placeholder="Min. 8 characters" value={form.password} onChange={e => set('password', e.target.value)} />
                  {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                  <div className="form-text">This password will be shared with the student. They should change it after first login.</div>
                </div>
                <div className="col-md-6 d-flex align-items-end">
                  <button type="button" className="btn btn-outline-secondary w-100"
                    onClick={() => {
                      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
                      const pwd = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
                      set('password', pwd);
                    }}>
                    <i className="bi bi-shuffle me-2"></i>Generate Strong Password
                  </button>
                </div>
                <div className="col-12">
                  <div className="alert alert-warning border-0 rounded-3 py-2 px-3 small">
                    <i className="bi bi-lock-fill me-2"></i>
                    The password will be <strong>bcrypt-hashed</strong> before storage. The plaintext will only be shown here and in the welcome email.
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── STEP 7: Review & Create ───────────────────────────────────── */}
          {step === 7 && (
            <>
              <h5 className="fw-bold mb-4"><i className="bi bi-check2-circle text-primary me-2"></i>Review & Confirm</h5>
              <p className="text-muted mb-4">Please review all details before creating the student account.</p>

              <div className="row g-3">
                {/* Personal */}
                <div className="col-12">
                  <div className="card border rounded-3">
                    <div className="card-header bg-light fw-semibold small py-2"><i className="bi bi-person me-2"></i>Personal Information</div>
                    <div className="card-body p-3">
                      <div className="row g-2 small">
                        <div className="col-md-4"><span className="text-muted">Name:</span><div className="fw-semibold">{form.full_name}</div></div>
                        <div className="col-md-4"><span className="text-muted">Email:</span><div className="fw-semibold">{form.email}</div></div>
                        <div className="col-md-4"><span className="text-muted">Phone:</span><div className="fw-semibold">{form.phone}</div></div>
                        <div className="col-md-4"><span className="text-muted">DOB:</span><div className="fw-semibold">{form.dob || '—'}</div></div>
                        <div className="col-md-4"><span className="text-muted">Gender:</span><div className="fw-semibold">{form.gender}</div></div>
                        <div className="col-md-4"><span className="text-muted">Address:</span><div className="fw-semibold">{form.address || '—'}</div></div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Course & Batch */}
                <div className="col-12">
                  <div className="card border rounded-3">
                    <div className="card-header bg-light fw-semibold small py-2"><i className="bi bi-mortarboard me-2"></i>Course & Batch</div>
                    <div className="card-body p-3">
                      <div className="row g-2 small">
                        <div className="col-md-4"><span className="text-muted">Course:</span><div className="fw-semibold">{selectedCourse?.name || '—'}</div></div>
                        <div className="col-md-4"><span className="text-muted">Batch:</span><div className="fw-semibold">{selectedBatch?.name || '—'} ({selectedBatch?.batch_code})</div></div>
                        <div className="col-md-4"><span className="text-muted">Trainer:</span><div className="fw-semibold">{selectedTrainer?.full_name || 'Auto-assigned'}</div></div>
                        <div className="col-md-4"><span className="text-muted">Admission Date:</span><div className="fw-semibold">{form.admission_date}</div></div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Fees */}
                <div className="col-12">
                  <div className="card border rounded-3">
                    <div className="card-header bg-light fw-semibold small py-2"><i className="bi bi-receipt me-2"></i>Fees</div>
                    <div className="card-body p-3">
                      <div className="row g-2 small">
                        <div className="col-md-3"><span className="text-muted">Currency:</span><div className="fw-semibold">{form.currency}</div></div>
                        <div className="col-md-3"><span className="text-muted">Original Fee:</span><div className="fw-semibold">{form.currency === 'INR' ? '₹' : '$'}{courseFee.toLocaleString()}</div></div>
                        <div className="col-md-3"><span className="text-muted">Discount:</span><div className="fw-semibold text-danger">-{form.currency === 'INR' ? '₹' : '$'}{discountAmount.toLocaleString()}</div></div>
                        <div className="col-md-3"><span className="text-muted">Net Payable:</span><div className="fw-bold text-success">{form.currency === 'INR' ? '₹' : '$'}{netPayable.toLocaleString()}</div></div>
                        {couponResult && <div className="col-12"><span className="badge bg-success me-2">Coupon Applied: {form.coupon_code}</span></div>}
                        <div className="col-md-4"><span className="text-muted">Instalments:</span><div className="fw-semibold">{form.installment_count} × {form.currency === 'INR' ? '₹' : '$'}{parseFloat(installmentAmt).toLocaleString()}</div></div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Mock Credits */}
                {form.mock_interview_credits > 0 && (
                  <div className="col-12">
                    <div className="card border rounded-3">
                      <div className="card-header bg-light fw-semibold small py-2"><i className="bi bi-star me-2"></i>Mock Credits</div>
                      <div className="card-body p-3 small">
                        <span className="fw-semibold">{form.mock_interview_credits}</span> credits
                        {form.mock_credit_expiry && <span> · Expires: <strong>{form.mock_credit_expiry}</strong></span>}
                      </div>
                    </div>
                  </div>
                )}
                <div className="col-12">
                  <div className="alert alert-primary border-0 rounded-3 py-2 px-3 small">
                    <i className="bi bi-info-circle me-2"></i>
                    Clicking <strong>Create Student</strong> will run all steps in a single database transaction.
                    If any step fails, all changes will be automatically rolled back.
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Navigation Buttons */}
          <div className="d-flex justify-content-between mt-4 pt-3 border-top">
            <button type="button" className="btn btn-light border rounded-pill px-4" onClick={prevStep} disabled={step === 1}>
              <i className="bi bi-arrow-left me-1"></i> Previous
            </button>
            {step < STEPS.length ? (
              <button type="button" className="btn btn-primary rounded-pill px-4 fw-semibold" onClick={nextStep}>
                Next <i className="bi bi-arrow-right ms-1"></i>
              </button>
            ) : (
              <button type="button" className="btn btn-success rounded-pill px-4 fw-semibold" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <><span className="spinner-border spinner-border-sm me-2"></span>Creating...</> : <><i className="bi bi-check2-circle me-2"></i>Create Student</>}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default AddStudent;
