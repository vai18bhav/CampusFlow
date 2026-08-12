import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Login = () => {
  const [email, setEmail] = useState(() => localStorage.getItem('cf_saved_email') || 'admin@campusflow.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('cf_saved_email'));
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Modals
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [signUpData, setSignUpData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    qualification: '',
    guardian_name: '',
    guardian_phone: ''
  });
  const [signUpMsg, setSignUpMsg] = useState('');
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [signUpLoading, setSignUpLoading] = useState(false);

  const [showDemoSelector, setShowDemoSelector] = useState(true);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleKeyDown = (e) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setCapsLockOn(true);
    } else {
      setCapsLockOn(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (rememberMe) {
        localStorage.setItem('cf_saved_email', email);
      } else {
        localStorage.removeItem('cf_saved_email');
      }

      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMsg('');
    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail });
      if (res.success) {
        setForgotMsg('Password reset instructions sent to your email!');
      }
    } catch (err) {
      setForgotMsg(typeof err === 'string' ? err : 'Request failed.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleStudentSignUp = async (e) => {
    e.preventDefault();
    setSignUpLoading(true);
    setSignUpMsg('');
    setSignUpSuccess(false);

    try {
      const res = await api.post('/auth/register-student', signUpData);
      if (res.success) {
        setSignUpSuccess(true);
        setSignUpMsg(res.message || 'Registration submitted! Your account is pending administrator approval.');
      }
    } catch (err) {
      setSignUpMsg(typeof err === 'string' ? err : 'Registration failed. Please check details.');
    } finally {
      setSignUpLoading(false);
    }
  };

  const fillDemoAccount = (roleEmail) => {
    setEmail(roleEmail);
    setPassword('password123');
    setError('');
  };

  return (
    <div className="min-vh-100 w-100 d-flex align-items-center justify-content-center p-3" style={{ background: 'radial-gradient(circle at 50% 35%, #1e293b 0%, #0b1120 100%)', position: 'relative', overflow: 'hidden' }}>
      
      {/* Decorative Subtle Glowing Background Elements */}
      <div style={{ position: 'absolute', top: '15%', left: '20%', width: '380px', height: '380px', background: 'rgba(37, 99, 235, 0.12)', filter: 'blur(100px)', borderRadius: '50%', pointerEvents: 'none' }}></div>
      <div style={{ position: 'absolute', bottom: '15%', right: '20%', width: '380px', height: '380px', background: 'rgba(245, 158, 11, 0.10)', filter: 'blur(100px)', borderRadius: '50%', pointerEvents: 'none' }}></div>

      <div style={{ width: '100%', maxWidth: '440px', zIndex: 10 }}>
        {/* Sleek Glassmorphic Card */}
        <div className="p-4 p-md-5 text-center shadow-lg border border-secondary border-opacity-25" style={{ background: 'rgba(15, 23, 42, 0.92)', backdropFilter: 'blur(20px)', borderRadius: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)' }}>
          
          {/* Brand Header */}
          <div className="d-inline-flex align-items-center justify-content-center gap-2.5 mb-3">
            <div className="brand-badge-cf shadow-sm" style={{ width: '42px', height: '42px', fontSize: '1.15rem', background: 'linear-gradient(135deg, #f59e0b 0%, #ff9800 100%)', color: '#000', fontWeight: '800', borderRadius: '10px' }}>
              CF
            </div>
            <h3 className="fw-extrabold text-white mb-0" style={{ letterSpacing: '-0.3px' }}>CampusFlow</h3>
          </div>

          <h5 className="fw-extrabold text-white mb-1">Sign In</h5>
          <p className="text-white-50 small mb-4" style={{ fontSize: '0.85rem' }}>Access your Training & Admission Management portal</p>

          {error && (
            <div className="alert alert-danger py-2.5 px-3 small rounded-3 mb-3 text-start" style={{ fontSize: '0.825rem' }}>
              <i className="bi bi-exclamation-triangle-fill me-2"></i> {error}
            </div>
          )}

          {capsLockOn && (
            <div className="alert alert-warning py-1.5 px-3 small rounded-3 mb-3 text-start" style={{ fontSize: '0.775rem' }}>
              <i className="bi bi-capslock-fill me-1.5"></i> Caps Lock is ON
            </div>
          )}

          <form onSubmit={handleSubmit} className="text-start">
            {/* Email Input */}
            <div className="mb-3">
              <label className="form-label text-white-50 small fw-semibold">Email Address</label>
              <div className="position-relative">
                <input
                  type="email"
                  className="form-control bg-secondary bg-opacity-25 text-white border-secondary rounded-3 py-2.5 px-3 pe-5"
                  placeholder="user@campusflow.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <i className="bi bi-envelope position-absolute top-50 end-0 translate-middle-y me-3 text-muted"></i>
              </div>
            </div>

            {/* Password Input with Show/Hide Eye Toggle */}
            <div className="mb-3">
              <label className="form-label text-white-50 small fw-semibold">Password</label>
              <div className="position-relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control bg-secondary bg-opacity-25 text-white border-secondary rounded-3 py-2.5 px-3 pe-5"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  required
                />
                <i
                  className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'} position-absolute top-50 end-0 translate-middle-y me-3 text-muted`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                ></i>
              </div>
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="form-check mb-0">
                <input
                  type="checkbox"
                  className="form-check-input bg-secondary bg-opacity-25 border-secondary"
                  id="rememberCheck"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label className="form-check-label text-white-50 small" htmlFor="rememberCheck" style={{ fontSize: '0.8rem' }}>
                  Remember me
                </label>
              </div>

              <span
                className="text-warning small fw-semibold"
                style={{ fontSize: '0.8rem', cursor: 'pointer' }}
                onClick={() => { setForgotEmail(email); setShowForgotModal(true); }}
              >
                Forgot Password?
              </span>
            </div>

            {/* Golden Amber Sign In Button */}
            <button
              type="submit"
              className="btn btn-warning text-dark fw-extrabold w-100 rounded-3 py-2.5 mb-3 shadow"
              disabled={loading}
              style={{ fontSize: '0.95rem', letterSpacing: '0.5px' }}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Signing In...
                </>
              ) : (
                <>
                  Sign In <i className="bi bi-arrow-right ms-1"></i>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts Drawer & Sign Up */}
          <div className="pt-3 border-top border-secondary border-opacity-25 text-center">
            <div className="d-flex justify-content-center align-items-center gap-3">
              <span className="text-white-50 small" style={{ cursor: 'pointer' }} onClick={() => { setSignUpMsg(''); setShowSignUpModal(true); }}>
                <i className="bi bi-person-plus me-1 text-warning"></i> Register as Student
              </span>
              <span className="text-white-50">•</span>
              <span className="text-warning small fw-semibold" style={{ cursor: 'pointer' }} onClick={() => setShowDemoSelector(!showDemoSelector)}>
                <i className="bi bi-key me-1"></i> {showDemoSelector ? 'Hide Demo Roles' : 'Quick Demo Accounts'}
              </span>
            </div>

            {showDemoSelector && (
              <div className="mt-3 p-3 bg-secondary bg-opacity-25 rounded-3 border border-secondary text-start">
                <div className="text-white-50 mb-2 small fw-semibold">Click any role to test credentials (Password: password123):</div>
                <div className="d-flex flex-wrap gap-1.5">
                  <button type="button" className="btn btn-outline-warning btn-sm rounded-pill py-0.5 px-2.5 small" onClick={() => fillDemoAccount('superadmin@campusflow.com')}>Super Admin</button>
                  <button type="button" className="btn btn-outline-info btn-sm rounded-pill py-0.5 px-2.5 small" onClick={() => fillDemoAccount('admin@campusflow.com')}>Admin</button>
                  <button type="button" className="btn btn-outline-success btn-sm rounded-pill py-0.5 px-2.5 small" onClick={() => fillDemoAccount('sales@campusflow.com')}>Sales Exec</button>
                  <button type="button" className="btn btn-outline-primary btn-sm rounded-pill py-0.5 px-2.5 small" onClick={() => fillDemoAccount('trainer@campusflow.com')}>Trainer</button>
                  <button type="button" className="btn btn-outline-light btn-sm rounded-pill py-0.5 px-2.5 small" onClick={() => fillDemoAccount('support@campusflow.com')}>Support Exec</button>
                  <button type="button" className="btn btn-outline-warning btn-sm rounded-pill py-0.5 px-2.5 small" onClick={() => fillDemoAccount('student@campusflow.com')}>Student</button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Student Registration Sign Up Modal */}
      {showSignUpModal && (
        <div className="modal show d-block bg-dark bg-opacity-75" tabIndex="-1" style={{ zIndex: 2000 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4 bg-dark text-white">
              <div className="modal-header border-secondary">
                <h5 className="modal-title fw-bold text-warning"><i className="bi bi-person-plus me-2"></i>Student Registration</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowSignUpModal(false)}></button>
              </div>
              <form onSubmit={handleStudentSignUp}>
                <div className="modal-body text-start">
                  <p className="text-white-50 small mb-3">
                    Register your candidate student account. New registrations require administrator approval before access is activated.
                  </p>

                  {signUpMsg && (
                    <div className={`alert ${signUpSuccess ? 'alert-success' : 'alert-danger'} py-2 px-3 small rounded-3 mb-3`}>
                      {signUpMsg}
                    </div>
                  )}

                  {!signUpSuccess && (
                    <>
                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-white-50">Full Name</label>
                        <input
                          type="text"
                          className="form-control bg-secondary bg-opacity-25 text-white border-secondary"
                          placeholder="John Doe"
                          value={signUpData.full_name}
                          onChange={(e) => setSignUpData({ ...signUpData, full_name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="row g-2 mb-3">
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold text-white-50">Email Address</label>
                          <input
                            type="email"
                            className="form-control bg-secondary bg-opacity-25 text-white border-secondary"
                            placeholder="john@example.com"
                            value={signUpData.email}
                            onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold text-white-50">Phone Number</label>
                          <input
                            type="text"
                            className="form-control bg-secondary bg-opacity-25 text-white border-secondary"
                            placeholder="+1987654321"
                            value={signUpData.phone}
                            onChange={(e) => setSignUpData({ ...signUpData, phone: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="row g-2 mb-3">
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold text-white-50">Password</label>
                          <input
                            type="password"
                            className="form-control bg-secondary bg-opacity-25 text-white border-secondary"
                            placeholder="••••••••••••"
                            value={signUpData.password}
                            onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold text-white-50">Qualification</label>
                          <input
                            type="text"
                            className="form-control bg-secondary bg-opacity-25 text-white border-secondary"
                            placeholder="B.Tech, BCA, B.Sc Computer Science..."
                            value={signUpData.qualification}
                            onChange={(e) => setSignUpData({ ...signUpData, qualification: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="row g-2 mb-2">
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold text-white-50">Guardian Name</label>
                          <input
                            type="text"
                            className="form-control bg-secondary bg-opacity-25 text-white border-secondary"
                            placeholder="Guardian / Parent Name"
                            value={signUpData.guardian_name}
                            onChange={(e) => setSignUpData({ ...signUpData, guardian_name: e.target.value })}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold text-white-50">Guardian Phone</label>
                          <input
                            type="text"
                            className="form-control bg-secondary bg-opacity-25 text-white border-secondary"
                            placeholder="Guardian Contact Phone"
                            value={signUpData.guardian_phone}
                            onChange={(e) => setSignUpData({ ...signUpData, guardian_phone: e.target.value })}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="modal-footer border-secondary">
                  <button type="button" className="btn btn-outline-light rounded-pill" onClick={() => setShowSignUpModal(false)}>Close</button>
                  {!signUpSuccess && (
                    <button type="submit" className="btn btn-warning rounded-pill px-4 fw-bold" disabled={signUpLoading}>
                      {signUpLoading ? 'Registering...' : 'Register Account'}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="modal show d-block bg-dark bg-opacity-75" tabIndex="-1" style={{ zIndex: 2000 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 bg-dark text-white">
              <div className="modal-header border-secondary">
                <h5 className="modal-title fw-bold text-warning"><i className="bi bi-key me-2"></i>Reset Password</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowForgotModal(false)}></button>
              </div>
              <form onSubmit={handleForgotPassword}>
                <div className="modal-body text-start">
                  <p className="text-white-50 small mb-3">
                    Enter your registered email address and we will send password reset instructions.
                  </p>

                  {forgotMsg && (
                    <div className={`alert ${forgotMsg.includes('sent') ? 'alert-success' : 'alert-danger'} py-2 px-3 small rounded-3 mb-3`}>
                      {forgotMsg}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-white-50">Email Address</label>
                    <input
                      type="email"
                      className="form-control bg-secondary bg-opacity-25 text-white border-secondary"
                      placeholder="user@campusflow.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer border-secondary">
                  <button type="button" className="btn btn-outline-light rounded-pill" onClick={() => setShowForgotModal(false)}>Close</button>
                  <button type="submit" className="btn btn-warning rounded-pill px-4 fw-bold" disabled={forgotLoading}>
                    {forgotLoading ? 'Sending...' : 'Send Reset Link'}
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

export default Login;
