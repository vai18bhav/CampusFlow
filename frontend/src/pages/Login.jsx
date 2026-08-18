import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

/* ─── Demo accounts ─── */
const DEMO_ROLES = [
  { label: 'Super Admin', email: 'superadmin@campusflow.com', color: '#f59e0b', icon: '👑' },
  { label: 'Admin',       email: 'admin@campusflow.com',      color: '#3b82f6', icon: '🛡️' },
  { label: 'Sales Exec',  email: 'sales@campusflow.com',      color: '#10b981', icon: '💼' },
  { label: 'Trainer',     email: 'trainer@campusflow.com',    color: '#8b5cf6', icon: '🎓' },
  { label: 'Support',     email: 'support@campusflow.com',    color: '#64748b', icon: '🎧' },
  { label: 'Student',     email: 'student@campusflow.com',    color: '#ec4899', icon: '📚' },
];

const FEATURES = [
  { icon: '📋', title: 'Enrollment & Admissions', desc: 'Students request courses, admin approves with batch assignment' },
  { icon: '🪙', title: 'Coin Wallet System',       desc: 'Every student gets 10,000 welcome coins to pay for courses' },
  { icon: '📊', title: 'Live Analytics',           desc: 'Attendance tracking, assignment scores, mock interview results' },
  { icon: '📧', title: 'Smart Notifications',      desc: 'Automated emails for approvals, rejections, fee receipts' },
];

export default function Login() {
  const [email, setEmail]             = useState(() => localStorage.getItem('cf_saved_email') || '');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe]   = useState(() => !!localStorage.getItem('cf_saved_email'));
  const [capsLock, setCapsLock]       = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [activeTab, setActiveTab]     = useState('login'); // 'login' | 'register'

  // Forgot password
  const [forgotModal, setForgotModal]   = useState(false);
  const [forgotEmail, setForgotEmail]   = useState('');
  const [forgotMsg, setForgotMsg]       = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // Student self-registration
  const [regData, setRegData]     = useState({ full_name: '', email: '', phone: '', password: '', qualification: '', guardian_name: '', guardian_phone: '' });
  const [regMsg, setRegMsg]       = useState('');
  const [regSuccess, setRegSuccess] = useState(false);
  const [regLoading, setRegLoading] = useState(false);

  const { login } = useAuth();
  const navigate  = useNavigate();

  /* ─── Handlers ─── */
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
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
      if (res.success) setForgotMsg('Reset instructions sent to your email!');
    } catch (err) {
      setForgotMsg(typeof err === 'string' ? err : 'Request failed. Try again.');
    } finally { setForgotLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setRegLoading(true); setRegMsg(''); setRegSuccess(false);
    try {
      const res = await api.post('/auth/register-student', regData);
      if (res.success) {
        setRegSuccess(true);
        setRegMsg(res.message || 'Registration submitted! Awaiting admin approval.');
      }
    } catch (err) {
      setRegMsg(typeof err === 'string' ? err : 'Registration failed. Please check your details.');
    } finally { setRegLoading(false); }
  };

  const fillDemo = (demoEmail) => { setEmail(demoEmail); setPassword('password123'); setError(''); setActiveTab('login'); };

  /* ─── Shared input style ─── */
  const inputStyle = {
    width: '100%', padding: '0.75rem 1rem', borderRadius: '10px',
    border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.07)',
    color: '#fff', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none',
    transition: 'border-color 0.2s',
  };
  const labelStyle = { fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.55)', display: 'block', marginBottom: '0.4rem', letterSpacing: '0.04rem', textTransform: 'uppercase' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#070d1a', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* ── LEFT PANEL — Branding ── */}
      <div style={{ flex: 1, display: 'none', flexDirection: 'column', justifyContent: 'center', padding: '4rem', background: 'linear-gradient(145deg, #0d1833 0%, #111827 100%)', borderRight: '1px solid rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden' }}
        className="login-left-panel">
        {/* Glow */}
        <div style={{ position: 'absolute', top: '10%', left: '-60px', width: '300px', height: '300px', background: 'rgba(245,158,11,0.12)', filter: 'blur(90px)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '-40px', width: '260px', height: '260px', background: 'rgba(59,130,246,0.1)', filter: 'blur(90px)', borderRadius: '50%', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '3rem' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'linear-gradient(135deg, #f59e0b, #ff9800)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.1rem', color: '#000', boxShadow: '0 8px 25px rgba(245,158,11,0.4)' }}>CF</div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>CampusFlow</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: '0.08rem' }}>TRAINING & ADMISSIONS</div>
            </div>
          </div>

          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: '1rem', letterSpacing: '-0.5px' }}>
            Your Complete<br />
            <span style={{ background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Training Portal</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '2.5rem', maxWidth: '360px' }}>
            Manage admissions, courses, students, attendance, and placements — all in one place.
          </p>

          {/* Feature List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>{f.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem', marginBottom: '0.1rem' }}>{f.title}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Demo pill */}
          <div style={{ marginTop: '2.5rem', padding: '0.75rem 1rem', borderRadius: '12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)' }}>
            🔑 Demo password for all accounts: <strong style={{ color: '#f59e0b' }}>password123</strong>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — Forms ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', minWidth: 0 }}>
        <div style={{ width: '100%', maxWidth: '430px' }}>

          {/* Mobile Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '2rem', justifyContent: 'center' }} className="login-mobile-logo">
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #f59e0b, #ff9800)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#000' }}>CF</div>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff' }}>CampusFlow</div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Training & Admissions Portal</div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', padding: '4px', marginBottom: '1.8rem', border: '1px solid rgba(255,255,255,0.08)' }}>
            {['login', 'register'].map(tab => (
              <button key={tab} onClick={() => { setActiveTab(tab); setError(''); setRegMsg(''); }}
                style={{ flex: 1, padding: '0.6rem', borderRadius: '9px', border: 'none', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', transition: 'all 0.2s',
                  background: activeTab === tab ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.4)' }}>
                {tab === 'login' ? '🔑 Sign In' : '📝 Register'}
              </button>
            ))}
          </div>

          {/* ─── LOGIN FORM ─── */}
          {activeTab === 'login' && (
            <div>
              <h2 style={{ color: '#fff', fontWeight: 900, fontSize: '1.6rem', margin: '0 0 0.3rem', letterSpacing: '-0.5px' }}>Welcome back</h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem', marginBottom: '1.8rem' }}>Sign in to your CampusFlow account</p>

              {error && (
                <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5', fontSize: '0.85rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  ⚠️ {error}
                </div>
              )}

              {capsLock && (
                <div style={{ padding: '0.6rem 1rem', borderRadius: '10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24', fontSize: '0.8rem', marginBottom: '1rem' }}>
                  ⇪ Caps Lock is ON
                </div>
              )}

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@campusflow.com" required style={{ ...inputStyle, paddingRight: '2.5rem' }} onFocus={e => e.target.style.borderColor = '#f59e0b'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'} />
                    <span style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>✉</span>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => setCapsLock(e.getModifierState?.('CapsLock'))} placeholder="••••••••••" required style={{ ...inputStyle, paddingRight: '2.8rem' }} onFocus={e => e.target.style.borderColor = '#f59e0b'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'} />
                    <span onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1rem', userSelect: 'none' }}>
                      {showPassword ? '🙈' : '👁'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ accentColor: '#f59e0b', width: '15px', height: '15px' }} />
                    <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>Remember me</span>
                  </label>
                  <span onClick={() => { setForgotEmail(email); setForgotMsg(''); setForgotModal(true); }} style={{ fontSize: '0.82rem', color: '#f59e0b', fontWeight: 700, cursor: 'pointer' }}>
                    Forgot Password?
                  </span>
                </div>

                <button type="submit" disabled={loading} style={{ padding: '0.85rem', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer', letterSpacing: '0.3px', transition: 'opacity 0.2s', opacity: loading ? 0.7 : 1, marginTop: '0.3rem' }}>
                  {loading ? '⏳ Signing in...' : 'Sign In →'}
                </button>
              </form>

              {/* Demo Accounts */}
              <div style={{ marginTop: '1.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600, whiteSpace: 'nowrap' }}>QUICK DEMO ACCESS</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {DEMO_ROLES.map(r => (
                    <button key={r.email} onClick={() => fillDemo(r.email)}
                      style={{ padding: '0.55rem 0.3rem', borderRadius: '9px', border: `1px solid ${r.color}30`, background: `${r.color}10`, color: r.color, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${r.color}20`; e.currentTarget.style.borderColor = `${r.color}60`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = `${r.color}10`; e.currentTarget.style.borderColor = `${r.color}30`; }}>
                      <div>{r.icon}</div>
                      <div style={{ marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</div>
                    </button>
                  ))}
                </div>
                <div style={{ textAlign: 'center', marginTop: '0.7rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)' }}>
                  All demo passwords: <strong style={{ color: 'rgba(255,255,255,0.4)' }}>password123</strong>
                </div>
              </div>
            </div>
          )}

          {/* ─── REGISTER FORM ─── */}
          {activeTab === 'register' && (
            <div>
              <h2 style={{ color: '#fff', fontWeight: 900, fontSize: '1.6rem', margin: '0 0 0.3rem', letterSpacing: '-0.5px' }}>Student Registration</h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>Create your student account. An admin will review and activate it. You'll receive <strong style={{ color: '#f59e0b' }}>🪙 10,000 welcome coins</strong> on approval!</p>

              {regMsg && (
                <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: regSuccess ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${regSuccess ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`, color: regSuccess ? '#6ee7b7' : '#fca5a5', fontSize: '0.85rem', marginBottom: '1.2rem' }}>
                  {regSuccess ? '✅' : '⚠️'} {regMsg}
                </div>
              )}

              {!regSuccess && (
                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div>
                    <label style={labelStyle}>Full Name *</label>
                    <input type="text" value={regData.full_name} onChange={e => setRegData({ ...regData, full_name: e.target.value })} placeholder="Your full name" required style={inputStyle} onFocus={e => e.target.style.borderColor = '#f59e0b'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem' }}>
                    <div>
                      <label style={labelStyle}>Email *</label>
                      <input type="email" value={regData.email} onChange={e => setRegData({ ...regData, email: e.target.value })} placeholder="john@email.com" required style={inputStyle} onFocus={e => e.target.style.borderColor = '#f59e0b'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'} />
                    </div>
                    <div>
                      <label style={labelStyle}>Phone *</label>
                      <input type="text" value={regData.phone} onChange={e => setRegData({ ...regData, phone: e.target.value })} placeholder="+91 98765..." required style={inputStyle} onFocus={e => e.target.style.borderColor = '#f59e0b'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem' }}>
                    <div>
                      <label style={labelStyle}>Password *</label>
                      <input type="password" value={regData.password} onChange={e => setRegData({ ...regData, password: e.target.value })} placeholder="Create password" required style={inputStyle} onFocus={e => e.target.style.borderColor = '#f59e0b'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'} />
                    </div>
                    <div>
                      <label style={labelStyle}>Qualification</label>
                      <input type="text" value={regData.qualification} onChange={e => setRegData({ ...regData, qualification: e.target.value })} placeholder="B.Tech, BCA..." style={inputStyle} onFocus={e => e.target.style.borderColor = '#f59e0b'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem' }}>
                    <div>
                      <label style={labelStyle}>Guardian Name</label>
                      <input type="text" value={regData.guardian_name} onChange={e => setRegData({ ...regData, guardian_name: e.target.value })} placeholder="Parent / Guardian" style={inputStyle} onFocus={e => e.target.style.borderColor = '#f59e0b'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'} />
                    </div>
                    <div>
                      <label style={labelStyle}>Guardian Phone</label>
                      <input type="text" value={regData.guardian_phone} onChange={e => setRegData({ ...regData, guardian_phone: e.target.value })} placeholder="+91 98765..." style={inputStyle} onFocus={e => e.target.style.borderColor = '#f59e0b'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'} />
                    </div>
                  </div>

                  <button type="submit" disabled={regLoading} style={{ padding: '0.85rem', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer', marginTop: '0.3rem', opacity: regLoading ? 0.7 : 1 }}>
                    {regLoading ? '⏳ Submitting...' : '📝 Submit Registration'}
                  </button>
                  <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                    Already have an account?{' '}
                    <span onClick={() => setActiveTab('login')} style={{ color: '#f59e0b', cursor: 'pointer', fontWeight: 700 }}>Sign In →</span>
                  </p>
                </form>
              )}

              {regSuccess && (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                  <div style={{ color: '#fff', fontWeight: 700, marginBottom: '0.5rem' }}>Registration Submitted!</div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Admin will review your account. You'll receive an email once approved.</div>
                  <button onClick={() => setActiveTab('login')} style={{ padding: '0.7rem 2rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000', fontWeight: 800, cursor: 'pointer' }}>
                    Go to Sign In →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── FORGOT PASSWORD MODAL ── */}
      {forgotModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }}>
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', padding: '2rem', width: '100%', maxWidth: '420px', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔑</div>
              <h3 style={{ color: '#fff', fontWeight: 800, margin: 0 }}>Reset Password</h3>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', marginTop: '0.4rem' }}>We'll send reset instructions to your email.</p>
            </div>
            {forgotMsg && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: forgotMsg.includes('sent') ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${forgotMsg.includes('sent') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, color: forgotMsg.includes('sent') ? '#6ee7b7' : '#fca5a5', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {forgotMsg}
              </div>
            )}
            <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Email Address</label>
                <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="user@campusflow.com" required style={inputStyle} onFocus={e => e.target.style.borderColor = '#f59e0b'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'} />
              </div>
              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <button type="button" onClick={() => setForgotModal(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
                <button type="submit" disabled={forgotLoading} style={{ flex: 2, padding: '0.75rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000', fontWeight: 800, cursor: 'pointer' }}>
                  {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── INLINE RESPONSIVE STYLES ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        @media (min-width: 900px) {
          .login-left-panel { display: flex !important; }
          .login-mobile-logo { display: none !important; }
        }
        input::placeholder { color: rgba(255,255,255,0.2) !important; }
        input:focus { border-color: #f59e0b !important; box-shadow: 0 0 0 3px rgba(245,158,11,0.15) !important; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px #0d1833 inset !important;
          -webkit-text-fill-color: #fff !important;
        }
      `}</style>
    </div>
  );
}
