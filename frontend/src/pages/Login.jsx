import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const DEMO_ROLES = [
  { label: 'Super Admin', email: 'superadmin@campusflow.com', color: '#f97316', bg: '#fff7ed' },
  { label: 'Admin',       email: 'admin@campusflow.com',      color: '#2563eb', bg: '#eff6ff' },
  { label: 'Sales Exec',  email: 'sales@campusflow.com',      color: '#16a34a', bg: '#f0fdf4' },
  { label: 'Trainer',     email: 'trainer@campusflow.com',    color: '#7c3aed', bg: '#f5f3ff' },
  { label: 'Support',     email: 'support@campusflow.com',    color: '#0891b2', bg: '#ecfeff' },
  { label: 'Student',     email: 'student@campusflow.com',    color: '#db2777', bg: '#fdf2f8' },
];

const FEATURES = [
  { icon: '🎓', text: 'Course Enrollment with Coin Wallet' },
  { icon: '📊', text: 'Attendance & Assignment Tracking' },
  { icon: '📋', text: 'Admission & Batch Management' },
  { icon: '📧', text: 'Automated Email Notifications' },
];

export default function Login() {
  const [email, setEmail]         = useState(() => localStorage.getItem('cf_saved_email') || '');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('cf_saved_email'));
  const [capsLock, setCapsLock]   = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [tab, setTab]             = useState('login');

  // Forgot password
  const [forgotModal, setForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg]     = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // Registration
  const [reg, setReg]           = useState({ full_name: '', email: '', phone: '', password: '', qualification: '', guardian_name: '', guardian_phone: '' });
  const [regMsg, setRegMsg]     = useState('');
  const [regOk, setRegOk]       = useState(false);
  const [regLoading, setRegLoading] = useState(false);

  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      if (rememberMe) localStorage.setItem('cf_saved_email', email);
      else localStorage.removeItem('cf_saved_email');
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Invalid credentials. Please try again.');
    } finally { setLoading(false); }
  };

  const handleForgot = async (e) => {
    e.preventDefault(); setForgotLoading(true); setForgotMsg('');
    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail });
      if (res.success) setForgotMsg('Reset link sent to your email!');
    } catch (err) { setForgotMsg(typeof err === 'string' ? err : 'Failed. Try again.'); }
    finally { setForgotLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setRegLoading(true); setRegMsg(''); setRegOk(false);
    try {
      const res = await api.post('/auth/register-student', reg);
      if (res.success) { setRegOk(true); setRegMsg(res.message || 'Registration submitted! Awaiting admin approval.'); }
    } catch (err) { setRegMsg(typeof err === 'string' ? err : 'Registration failed. Check your details.'); }
    finally { setRegLoading(false); }
  };

  const fillDemo = (demoEmail) => { setEmail(demoEmail); setPassword('password123'); setError(''); setTab('login'); };

  // Shared input style — light theme
  const inp = {
    width: '100%', padding: '0.75rem 1rem', borderRadius: '10px',
    border: '1.5px solid #e2e8f0', background: '#f8fafc',
    color: '#1e293b', fontSize: '0.9rem', boxSizing: 'border-box',
    outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: 'inherit'
  };
  const lbl = { fontSize: '0.78rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '0.4rem', letterSpacing: '0.05rem', textTransform: 'uppercase' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Inter', 'Segoe UI', sans-serif", background: '#f1f5f9' }}>

      {/* ── LEFT PANEL — light gradient branding ── */}
      <div className="cf-login-left" style={{ flex: '0 0 42%', display: 'none', flexDirection: 'column', justifyContent: 'center', padding: '3.5rem', background: 'linear-gradient(150deg, #fffbeb 0%, #fff7ed 40%, #fef3c7 100%)', borderRight: '1px solid #fde68a', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '280px', height: '280px', borderRadius: '50%', background: 'rgba(251,191,36,0.18)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(249,115,22,0.12)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
            <img src="/logo.png" alt="CampusFlow Logo" style={{ width: '58px', height: '58px', borderRadius: '16px', objectFit: 'cover', boxShadow: '0 6px 20px rgba(249,115,22,0.3)' }} />
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b', letterSpacing: '-0.5px' }}>CampusFlow</div>
              <div style={{ fontSize: '0.72rem', color: '#f97316', fontWeight: 700, letterSpacing: '0.1rem', textTransform: 'uppercase' }}>Training & Admissions</div>
            </div>
          </div>

          <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#1e293b', lineHeight: 1.25, marginBottom: '0.8rem', letterSpacing: '-0.5px' }}>
            Manage Your Campus<br />
            <span style={{ color: '#f97316' }}>All in One Place</span>
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: 1.7, marginBottom: '2rem', maxWidth: '340px' }}>
            A complete portal for training institutes — from admission to placement, powered by smart tools.
          </p>

          {/* Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>{f.icon}</div>
                <span style={{ color: '#475569', fontSize: '0.88rem', fontWeight: 600 }}>{f.text}</span>
              </div>
            ))}
          </div>

          {/* Demo note */}
          <div style={{ marginTop: '2.5rem', padding: '0.9rem 1.1rem', borderRadius: '12px', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', fontSize: '0.82rem', color: '#92400e' }}>
            🔑 Demo password for all accounts: <strong style={{ color: '#f97316' }}>password123</strong>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — white form card ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', minWidth: 0 }}>
        <div style={{ width: '100%', maxWidth: '440px' }}>

          {/* Mobile logo */}
          <div className="cf-login-mobile-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.8rem', justifyContent: 'center' }}>
            <img src="/logo.png" alt="CampusFlow" style={{ width: '46px', height: '46px', borderRadius: '12px', objectFit: 'cover', boxShadow: '0 4px 14px rgba(249,115,22,0.25)' }} />
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b' }}>CampusFlow</div>
              <div style={{ fontSize: '0.7rem', color: '#f97316', fontWeight: 700, letterSpacing: '0.08rem' }}>TRAINING & ADMISSIONS</div>
            </div>
          </div>

          {/* Card */}
          <div style={{ background: '#fff', borderRadius: '20px', boxShadow: '0 4px 30px rgba(0,0,0,0.08)', padding: '2.2rem', border: '1px solid #e2e8f0' }}>

            {/* Tabs */}
            <div style={{ display: 'flex', borderRadius: '10px', background: '#f1f5f9', padding: '4px', marginBottom: '1.8rem' }}>
              {['login', 'register'].map(t => (
                <button key={t} onClick={() => { setTab(t); setError(''); setRegMsg(''); }}
                  style={{ flex: 1, padding: '0.6rem', borderRadius: '7px', border: 'none', fontWeight: 700, fontSize: '0.87rem', cursor: 'pointer', transition: 'all 0.2s',
                    background: tab === t ? '#fff' : 'transparent',
                    color: tab === t ? '#f97316' : '#94a3b8',
                    boxShadow: tab === t ? '0 1px 6px rgba(0,0,0,0.1)' : 'none' }}>
                  {t === 'login' ? '🔑 Sign In' : '📝 Register'}
                </button>
              ))}
            </div>

            {/* ─── LOGIN ─── */}
            {tab === 'login' && (
              <div>
                <h2 style={{ color: '#1e293b', fontWeight: 900, fontSize: '1.5rem', margin: '0 0 0.25rem', letterSpacing: '-0.4px' }}>Welcome back 👋</h2>
                <p style={{ color: '#94a3b8', fontSize: '0.86rem', marginBottom: '1.5rem' }}>Sign in to your CampusFlow account</p>

                {error && (
                  <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.85rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    ⚠️ {error}
                  </div>
                )}
                {capsLock && (
                  <div style={{ padding: '0.6rem 1rem', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e', fontSize: '0.8rem', marginBottom: '1rem' }}>
                    ⇪ Caps Lock is ON
                  </div>
                )}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={lbl}>Email Address</label>
                    <div style={{ position: 'relative' }}>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@campusflow.com" required style={{ ...inp, paddingRight: '2.6rem' }}
                        onFocus={e => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.12)'; }}
                        onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }} />
                      <span style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1', fontSize: '0.95rem' }}>✉</span>
                    </div>
                  </div>

                  <div>
                    <label style={lbl}>Password</label>
                    <div style={{ position: 'relative' }}>
                      <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => setCapsLock(e.getModifierState?.('CapsLock'))}
                        placeholder="••••••••••" required style={{ ...inp, paddingRight: '2.8rem' }}
                        onFocus={e => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.12)'; }}
                        onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }} />
                      <span onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem', userSelect: 'none' }}>
                        {showPw ? '🙈' : '👁'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ accentColor: '#f97316', width: '15px', height: '15px' }} />
                      <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Remember me</span>
                    </label>
                    <span onClick={() => { setForgotEmail(email); setForgotMsg(''); setForgotModal(true); }}
                      style={{ fontSize: '0.82rem', color: '#f97316', fontWeight: 700, cursor: 'pointer' }}>
                      Forgot Password?
                    </span>
                  </div>

                  <button type="submit" disabled={loading}
                    style={{ padding: '0.88rem', borderRadius: '11px', border: 'none', background: 'linear-gradient(135deg, #f97316, #f59e0b)', color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', transition: 'opacity 0.2s, transform 0.15s', opacity: loading ? 0.75 : 1, marginTop: '0.2rem', boxShadow: '0 4px 14px rgba(249,115,22,0.35)', letterSpacing: '0.2px' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                    {loading ? '⏳ Signing in...' : 'Sign In →'}
                  </button>
                </form>

                {/* Demo Accounts */}
                <div style={{ marginTop: '1.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
                    <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, whiteSpace: 'nowrap', letterSpacing: '0.05rem' }}>QUICK DEMO ACCESS</span>
                    <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem' }}>
                    {DEMO_ROLES.map(r => (
                      <button key={r.email} onClick={() => fillDemo(r.email)}
                        style={{ padding: '0.55rem 0.3rem', borderRadius: '9px', border: `1.5px solid ${r.color}25`, background: r.bg, color: r.color, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = r.color; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 4px 12px ${r.color}20`; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = `${r.color}25`; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '0.6rem', fontSize: '0.74rem', color: '#94a3b8' }}>
                    Password for all: <strong style={{ color: '#64748b' }}>password123</strong>
                  </div>
                </div>
              </div>
            )}

            {/* ─── REGISTER ─── */}
            {tab === 'register' && (
              <div>
                <h2 style={{ color: '#1e293b', fontWeight: 900, fontSize: '1.4rem', margin: '0 0 0.25rem', letterSpacing: '-0.4px' }}>Student Registration</h2>
                <p style={{ color: '#94a3b8', fontSize: '0.84rem', marginBottom: '1.3rem', lineHeight: 1.6 }}>
                  Create your account. You'll receive <strong style={{ color: '#f97316' }}>🪙 10,000 welcome coins</strong> on approval!
                </p>

                {regMsg && (
                  <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: regOk ? '#f0fdf4' : '#fef2f2', border: `1px solid ${regOk ? '#bbf7d0' : '#fecaca'}`, color: regOk ? '#15803d' : '#dc2626', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    {regOk ? '✅' : '⚠️'} {regMsg}
                  </div>
                )}

                {!regOk ? (
                  <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <div>
                      <label style={lbl}>Full Name *</label>
                      <input type="text" value={reg.full_name} onChange={e => setReg({ ...reg, full_name: e.target.value })} placeholder="Your full name" required style={inp}
                        onFocus={e => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.12)'; }}
                        onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem' }}>
                      <div>
                        <label style={lbl}>Email *</label>
                        <input type="email" value={reg.email} onChange={e => setReg({ ...reg, email: e.target.value })} placeholder="john@email.com" required style={inp}
                          onFocus={e => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.12)'; }}
                          onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }} />
                      </div>
                      <div>
                        <label style={lbl}>Phone *</label>
                        <input type="text" value={reg.phone} onChange={e => setReg({ ...reg, phone: e.target.value })} placeholder="+91 98765..." required style={inp}
                          onFocus={e => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.12)'; }}
                          onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem' }}>
                      <div>
                        <label style={lbl}>Password *</label>
                        <input type="password" value={reg.password} onChange={e => setReg({ ...reg, password: e.target.value })} placeholder="Create password" required style={inp}
                          onFocus={e => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.12)'; }}
                          onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }} />
                      </div>
                      <div>
                        <label style={lbl}>Qualification</label>
                        <input type="text" value={reg.qualification} onChange={e => setReg({ ...reg, qualification: e.target.value })} placeholder="B.Tech, BCA..." style={inp}
                          onFocus={e => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.12)'; }}
                          onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem' }}>
                      <div>
                        <label style={lbl}>Guardian Name</label>
                        <input type="text" value={reg.guardian_name} onChange={e => setReg({ ...reg, guardian_name: e.target.value })} placeholder="Parent name" style={inp}
                          onFocus={e => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.12)'; }}
                          onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }} />
                      </div>
                      <div>
                        <label style={lbl}>Guardian Phone</label>
                        <input type="text" value={reg.guardian_phone} onChange={e => setReg({ ...reg, guardian_phone: e.target.value })} placeholder="+91 98765..." style={inp}
                          onFocus={e => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.12)'; }}
                          onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }} />
                      </div>
                    </div>
                    <button type="submit" disabled={regLoading}
                      style={{ padding: '0.85rem', borderRadius: '11px', border: 'none', background: 'linear-gradient(135deg, #f97316, #f59e0b)', color: '#fff', fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer', marginTop: '0.3rem', opacity: regLoading ? 0.75 : 1, boxShadow: '0 4px 14px rgba(249,115,22,0.3)' }}>
                      {regLoading ? '⏳ Submitting...' : '📝 Submit Registration'}
                    </button>
                    <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                      Already have an account?{' '}
                      <span onClick={() => setTab('login')} style={{ color: '#f97316', cursor: 'pointer', fontWeight: 700 }}>Sign In →</span>
                    </p>
                  </form>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                    <div style={{ color: '#1e293b', fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Registration Submitted!</div>
                    <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Admin will review your account. You'll get an email once approved.</div>
                    <button onClick={() => setTab('login')}
                      style={{ padding: '0.7rem 2rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #f97316, #f59e0b)', color: '#fff', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px rgba(249,115,22,0.3)' }}>
                      Go to Sign In →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <p style={{ textAlign: 'center', marginTop: '1.2rem', fontSize: '0.75rem', color: '#94a3b8' }}>
            © 2026 CampusFlow · Training & Admission Management Portal
          </p>
        </div>
      </div>

      {/* ── FORGOT PASSWORD MODAL ── */}
      {forgotModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: '18px', padding: '2rem', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔑</div>
              <h3 style={{ color: '#1e293b', fontWeight: 800, margin: 0 }}>Reset Password</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.4rem' }}>Enter your email and we'll send reset instructions.</p>
            </div>
            {forgotMsg && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: forgotMsg.includes('sent') ? '#f0fdf4' : '#fef2f2', border: `1px solid ${forgotMsg.includes('sent') ? '#bbf7d0' : '#fecaca'}`, color: forgotMsg.includes('sent') ? '#15803d' : '#dc2626', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {forgotMsg}
              </div>
            )}
            <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={lbl}>Email Address</label>
                <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="user@campusflow.com" required style={inp}
                  onFocus={e => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }} />
              </div>
              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <button type="button" onClick={() => setForgotModal(false)}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontWeight: 700 }}>
                  Cancel
                </button>
                <button type="submit" disabled={forgotLoading}
                  style={{ flex: 2, padding: '0.75rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #f97316, #f59e0b)', color: '#fff', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(249,115,22,0.3)' }}>
                  {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @media (min-width: 900px) {
          .cf-login-left { display: flex !important; }
          .cf-login-mobile-logo { display: none !important; }
        }
        input::placeholder { color: #cbd5e1 !important; }
      `}</style>
    </div>
  );
}
