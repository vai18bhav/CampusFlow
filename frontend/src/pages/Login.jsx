import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const DEMO_ROLES = [
  { label: 'Super Admin', email: 'superadmin@campusflow.com', color: '#f97316', bgLight: '#fff7ed', bgDark: 'rgba(249,115,22,0.15)' },
  { label: 'Admin',       email: 'admin@campusflow.com',      color: '#38bdf8', bgLight: '#eff6ff', bgDark: 'rgba(56,189,248,0.15)' },
  { label: 'Sales Exec',  email: 'sales@campusflow.com',      color: '#34d399', bgLight: '#f0fdf4', bgDark: 'rgba(52,211,153,0.15)' },
  { label: 'Trainer',     email: 'trainer@campusflow.com',    color: '#a78bfa', bgLight: '#f5f3ff', bgDark: 'rgba(167,139,250,0.15)' },
  { label: 'Support',     email: 'support@campusflow.com',    color: '#22d3ee', bgLight: '#ecfeff', bgDark: 'rgba(34,211,238,0.15)' },
  { label: 'Student',     email: 'student@campusflow.com',    color: '#f472b6', bgLight: '#fdf2f8', bgDark: 'rgba(244,114,182,0.15)' },
];

const FEATURES = [
  { icon: '🎓', text: 'Course Enrollment & Admissions Management' },
  { icon: '📊', text: 'Real-time Attendance & Assignment Tracking' },
  { icon: '🗓️', text: 'Live Batch Timetable & Notification Alerts' },
  { icon: '📧', text: 'Automated Gmail SMTP Receipt & Class Updates' },
];

export default function Login() {
  const [email, setEmail]         = useState(() => localStorage.getItem('cf_saved_email') || '');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('cf_saved_email'));
  const [capsLock, setCapsLock]   = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  // Dark Mode State
  const [darkMode, setDarkMode]   = useState(() => localStorage.getItem('cf_theme') === 'dark');

  // Forgot password
  const [forgotModal, setForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg]     = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const { login } = useAuth();
  const navigate  = useNavigate();

  useEffect(() => {
    const savedTheme = localStorage.getItem('cf_theme') || 'light';
    setDarkMode(savedTheme === 'dark');
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    const themeStr = next ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', themeStr);
    localStorage.setItem('cf_theme', themeStr);
  };

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

  const fillDemo = (demoEmail) => { setEmail(demoEmail); setPassword('password123'); setError(''); };

  // Dynamic Styles based on theme
  const pageBg = darkMode ? '#090e17' : '#f1f5f9';
  const cardBg = darkMode ? '#111927' : '#ffffff';
  const textPrimary = darkMode ? '#f8fafc' : '#1e293b';
  const textSecondary = darkMode ? '#cbd5e1' : '#475569';
  const textMuted = darkMode ? '#94a3b8' : '#64748b';
  const borderCol = darkMode ? 'rgba(255, 255, 255, 0.09)' : '#e2e8f0';

  const inp = {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    border: `1.5px solid ${darkMode ? '#293951' : '#e2e8f0'}`,
    background: darkMode ? '#162235' : '#f8fafc',
    color: textPrimary,
    fontSize: '0.9rem',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: 'inherit'
  };

  const lbl = {
    fontSize: '0.76rem',
    fontWeight: 700,
    color: textMuted,
    display: 'block',
    marginBottom: '0.4rem',
    letterSpacing: '0.05rem',
    textTransform: 'uppercase'
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", background: pageBg, transition: 'background-color 0.25s ease', position: 'relative' }}>

      {/* ── TOP-RIGHT FLOATING THEME TOGGLE ── */}
      <div style={{ position: 'fixed', top: '1.25rem', right: '1.5rem', zIndex: 100 }}>
        <button
          onClick={toggleTheme}
          title={`Switch to ${darkMode ? 'Light' : 'Dark'} mode`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.55rem 1rem',
            borderRadius: '50px',
            border: `1.5px solid ${borderCol}`,
            background: cardBg,
            color: textPrimary,
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: darkMode ? '0 4px 16px rgba(0,0,0,0.5)' : '0 2px 10px rgba(0,0,0,0.08)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <span>{darkMode ? '🌙' : '☀️'}</span>
          <span>{darkMode ? 'Dark Theme' : 'Light Theme'}</span>
        </button>
      </div>

      {/* ── LEFT PANEL — Branding & Feature Showcase ── */}
      <div
        className="cf-login-left"
        style={{
          flex: '0 0 42%',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '3.5rem',
          background: darkMode
            ? 'linear-gradient(150deg, #0d1522 0%, #111a2e 45%, #172338 100%)'
            : 'linear-gradient(150deg, #fffbeb 0%, #fff7ed 40%, #fef3c7 100%)',
          borderRight: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.08)' : '#fde68a'}`,
          position: 'relative',
          overflow: 'hidden',
          transition: 'background 0.25s ease'
        }}
      >
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '280px', height: '280px', borderRadius: '50%', background: darkMode ? 'rgba(249,115,22,0.08)' : 'rgba(251,191,36,0.18)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: darkMode ? 'rgba(56,189,248,0.06)' : 'rgba(249,115,22,0.12)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
            <img src="/logo.png" alt="CampusFlow Logo" style={{ width: '58px', height: '58px', borderRadius: '16px', objectFit: 'cover', boxShadow: '0 6px 20px rgba(249,115,22,0.3)' }} />
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: textPrimary, letterSpacing: '-0.5px' }}>CampusFlow</div>
              <div style={{ fontSize: '0.72rem', color: '#f97316', fontWeight: 800, letterSpacing: '0.1rem', textTransform: 'uppercase' }}>Training & Admissions</div>
            </div>
          </div>

          <h2 style={{ fontSize: '2rem', fontWeight: 900, color: textPrimary, lineHeight: 1.25, marginBottom: '0.8rem', letterSpacing: '-0.5px' }}>
            Manage Your Campus<br />
            <span style={{ color: '#f97316' }}>All in One Place</span>
          </h2>
          <p style={{ color: textMuted, fontSize: '0.92rem', lineHeight: 1.7, marginBottom: '2rem', maxWidth: '340px' }}>
            An enterprise portal for training institutes — from admission to placement, powered by smart academic ledgers.
          </p>

          {/* Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: darkMode ? '#162235' : '#fff', border: `1px solid ${borderCol}`, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                  {f.icon}
                </div>
                <span style={{ color: textSecondary, fontSize: '0.88rem', fontWeight: 600 }}>{f.text}</span>
              </div>
            ))}
          </div>

          {/* Demo note */}
          <div style={{ marginTop: '2.5rem', padding: '0.9rem 1.1rem', borderRadius: '12px', background: darkMode ? 'rgba(249,115,22,0.12)' : 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)', fontSize: '0.82rem', color: darkMode ? '#fde047' : '#92400e' }}>
            🔑 Demo password for all accounts: <strong style={{ color: '#f97316' }}>password123</strong>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — Login Card ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', minWidth: 0 }}>
        <div style={{ width: '100%', maxWidth: '440px' }}>

          {/* Mobile logo */}
          <div className="cf-login-mobile-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.8rem', justifyContent: 'center' }}>
            <img src="/logo.png" alt="CampusFlow" style={{ width: '46px', height: '46px', borderRadius: '12px', objectFit: 'cover', boxShadow: '0 4px 14px rgba(249,115,22,0.25)' }} />
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: textPrimary }}>CampusFlow</div>
              <div style={{ fontSize: '0.7rem', color: '#f97316', fontWeight: 800, letterSpacing: '0.08rem' }}>TRAINING & ADMISSIONS</div>
            </div>
          </div>

          {/* Card */}
          <div style={{ background: cardBg, borderRadius: '20px', boxShadow: darkMode ? '0 10px 40px rgba(0,0,0,0.5)' : '0 4px 30px rgba(0,0,0,0.08)', padding: '2.2rem', border: `1px solid ${borderCol}`, transition: 'background-color 0.25s ease' }}>

            <div>
              <h2 style={{ color: textPrimary, fontWeight: 900, fontSize: '1.5rem', margin: '0 0 0.25rem', letterSpacing: '-0.4px' }}>Welcome back 👋</h2>
              <p style={{ color: textMuted, fontSize: '0.86rem', marginBottom: '1.5rem' }}>Sign in to your CampusFlow account</p>

              {error && (
                <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: darkMode ? 'rgba(239,68,68,0.15)' : '#fef2f2', border: '1px solid #f87171', color: '#f87171', fontSize: '0.85rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  ⚠️ {error}
                </div>
              )}
              {capsLock && (
                <div style={{ padding: '0.6rem 1rem', borderRadius: '10px', background: darkMode ? 'rgba(245,158,11,0.15)' : '#fffbeb', border: '1px solid #fcd34d', color: darkMode ? '#fbbf24' : '#92400e', fontSize: '0.8rem', marginBottom: '1rem' }}>
                  ⇪ Caps Lock is ON
                </div>
              )}

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={lbl}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="user@campusflow.com"
                      required
                      style={{ ...inp, paddingRight: '2.6rem' }}
                      onFocus={e => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.15)'; }}
                      onBlur={e => { e.target.style.borderColor = darkMode ? '#293951' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                    />
                    <span style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: textMuted, fontSize: '0.95rem' }}>✉</span>
                  </div>
                </div>

                <div>
                  <label style={lbl}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onKeyDown={e => setCapsLock(e.getModifierState?.('CapsLock'))}
                      placeholder="••••••••••"
                      required
                      style={{ ...inp, paddingRight: '2.8rem' }}
                      onFocus={e => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.15)'; }}
                      onBlur={e => { e.target.style.borderColor = darkMode ? '#293951' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                    />
                    <span onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: textMuted, cursor: 'pointer', fontSize: '1rem', userSelect: 'none' }}>
                      {showPw ? '🙈' : '👁'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ accentColor: '#f97316', width: '15px', height: '15px' }} />
                    <span style={{ fontSize: '0.82rem', color: textMuted, fontWeight: 600 }}>Remember me</span>
                  </label>
                  <span onClick={() => { setForgotEmail(email); setForgotMsg(''); setForgotModal(true); }}
                    style={{ fontSize: '0.82rem', color: '#f97316', fontWeight: 700, cursor: 'pointer' }}>
                    Forgot Password?
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '0.88rem',
                    borderRadius: '11px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #f97316, #f59e0b)',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s, transform 0.15s',
                    opacity: loading ? 0.75 : 1,
                    marginTop: '0.2rem',
                    boxShadow: '0 4px 14px rgba(249,115,22,0.35)',
                    letterSpacing: '0.2px'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  {loading ? '⏳ Signing in...' : 'Sign In →'}
                </button>
              </form>

              {/* Student Admissions Note */}
              <div style={{ marginTop: '1.2rem', padding: '0.75rem 1rem', borderRadius: '10px', background: darkMode ? 'rgba(56,189,248,0.1)' : '#eff6ff', border: '1px solid rgba(56,189,248,0.25)', fontSize: '0.8rem', color: darkMode ? '#38bdf8' : '#1e40af' }}>
                🎓 <strong>New Student Admission?</strong> Ask your Sales Executive for your unique admission link to apply.
              </div>

              {/* Quick Demo Access Roles */}
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
                  <div style={{ flex: 1, height: '1px', background: borderCol }} />
                  <span style={{ fontSize: '0.72rem', color: textMuted, fontWeight: 800, whiteSpace: 'nowrap', letterSpacing: '0.06rem' }}>QUICK DEMO ACCESS</span>
                  <div style={{ flex: 1, height: '1px', background: borderCol }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem' }}>
                  {DEMO_ROLES.map(r => (
                    <button
                      key={r.email}
                      onClick={() => fillDemo(r.email)}
                      style={{
                        padding: '0.55rem 0.3rem',
                        borderRadius: '9px',
                        border: `1.5px solid ${r.color}35`,
                        background: darkMode ? r.bgDark : r.bgLight,
                        color: r.color,
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = r.color; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 4px 12px ${r.color}30`; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = `${r.color}35`; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <div style={{ textAlign: 'center', marginTop: '0.65rem', fontSize: '0.74rem', color: textMuted }}>
                  Password for all: <strong style={{ color: textPrimary }}>password123</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FORGOT PASSWORD MODAL ── */}
      {forgotModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '1rem' }}>
          <div style={{ background: cardBg, borderRadius: '18px', padding: '2rem', width: '100%', maxWidth: '420px', border: `1px solid ${borderCol}`, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            <h3 style={{ color: textPrimary, fontWeight: 800, margin: '0 0 0.4rem' }}>Reset Password</h3>
            <p style={{ color: textMuted, fontSize: '0.86rem', marginBottom: '1.2rem' }}>Enter your email to receive a password reset link.</p>

            {forgotMsg && (
              <div style={{ padding: '0.7rem 1rem', borderRadius: '8px', background: forgotMsg.includes('sent') ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${forgotMsg.includes('sent') ? '#34d399' : '#f87171'}`, color: forgotMsg.includes('sent') ? '#34d399' : '#f87171', fontSize: '0.84rem', marginBottom: '1rem' }}>
                {forgotMsg}
              </div>
            )}

            <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="email" placeholder="your-email@campusflow.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required style={inp} />
              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <button type="button" onClick={() => setForgotModal(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: `1px solid ${borderCol}`, background: 'transparent', color: textMuted, cursor: 'pointer', fontWeight: 600 }}>
                  Cancel
                </button>
                <button type="submit" disabled={forgotLoading} style={{ flex: 2, padding: '0.75rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #f97316, #f59e0b)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                  {forgotLoading ? 'Sending...' : 'Send Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
