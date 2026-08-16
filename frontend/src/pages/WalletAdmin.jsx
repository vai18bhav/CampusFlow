import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function WalletAdmin() {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [creditModal, setCreditModal] = useState(null); // student wallet to credit
  const [creditForm, setCreditForm] = useState({ coins: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  const fetchWallets = () => {
    setLoading(true);
    api.get('/wallet/all').then(r => setWallets(r.data?.wallets || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchWallets(); }, []);

  const handleCredit = async (e) => {
    e.preventDefault();
    if (!creditForm.coins || parseInt(creditForm.coins) <= 0) { showToast('Enter a valid coin amount', 'error'); return; }
    setSubmitting(true);
    try {
      const r = await api.post('/wallet/credit', { student_id: creditModal.student_id, coins: parseInt(creditForm.coins), reason: creditForm.reason });
      showToast(r.message || `Coins credited successfully!`);
      setCreditModal(null);
      fetchWallets();
    } catch (err) { showToast(err || 'Failed to credit coins', 'error'); }
    setSubmitting(false);
  };

  const filtered = wallets.filter(w =>
    w.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    w.student_email?.toLowerCase().includes(search.toLowerCase()) ||
    w.roll_number?.toLowerCase().includes(search.toLowerCase())
  );

  const totalCoins = wallets.reduce((s, w) => s + (w.coins_balance || 0), 0);
  const totalEarned = wallets.reduce((s, w) => s + (w.total_earned || 0), 0);
  const totalSpent = wallets.reduce((s, w) => s + (w.total_spent || 0), 0);

  return (
    <div style={{ padding: '1.5rem' }}>
      {toast && <div style={{ position: 'fixed', top: '1rem', right: '1rem', padding: '0.85rem 1.4rem', borderRadius: '10px', background: toast.type === 'error' ? '#ef4444' : '#10b981', color: '#fff', fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', maxWidth: '400px' }}>{toast.msg}</div>}

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, background: 'linear-gradient(135deg, #7c3aed, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🪙 Student Wallet Management
        </h2>
        <p style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>View all student coin balances and manually credit coins (scholarships, bonuses, etc.)</p>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Students', val: wallets.length, icon: '👥', color: '#3b82f6' },
          { label: 'Coins in Circulation', val: totalCoins.toLocaleString('en-IN'), icon: '🪙', color: '#f59e0b' },
          { label: 'Total Earned', val: totalEarned.toLocaleString('en-IN'), icon: '⬆', color: '#10b981' },
          { label: 'Total Spent', val: totalSpent.toLocaleString('en-IN'), icon: '⬇', color: '#ef4444' }
        ].map((s, i) => (
          <div key={i} style={{ padding: '1.2rem', borderRadius: '14px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '0.3rem' }}>{s.icon}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div style={{ padding: '0.9rem 1.2rem', borderRadius: '12px', background: '#fef3c720', border: '1px solid #f59e0b30', marginBottom: '1.5rem', fontSize: '0.83rem', color: 'var(--text-muted)' }}>
        💡 <strong>New students</strong> automatically receive <strong style={{ color: '#f59e0b' }}>🪙 10,000 coins</strong> on registration.
        &nbsp;Coins are deducted from the student's wallet when their enrollment is approved.
        &nbsp;1 Coin = ₹1. You can credit extra coins below for scholarships or special programs.
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.2rem' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder='🔍 Search by name, email or roll number...'
          style={{ width: '100%', maxWidth: '380px', padding: '0.7rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading wallets...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🪙</div>
          <p>No student wallets found. Create students to see wallets here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {filtered.map(w => {
            const spendPct = w.total_earned > 0 ? Math.min(100, (w.total_spent / w.total_earned) * 100) : 0;
            const isLow = w.coins_balance < 3000;
            return (
              <div key={w.student_id} style={{ padding: '1.4rem', borderRadius: '14px', background: 'var(--card-bg)', border: `1px solid ${isLow ? '#ef444440' : 'var(--border-color)'}`, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>
                      {w.student_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.92rem' }}>{w.student_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{w.roll_number}</div>
                    </div>
                  </div>
                  {isLow && <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', background: '#fee2e2', color: '#ef4444', fontSize: '0.72rem', fontWeight: 700 }}>⚠ Low</span>}
                </div>

                {/* Coin Balance */}
                <div style={{ padding: '0.8rem', borderRadius: '10px', background: 'linear-gradient(135deg, #7c3aed15, #f59e0b10)', marginBottom: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>BALANCE</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: isLow ? '#ef4444' : '#f59e0b', lineHeight: 1 }}>{w.coins_balance.toLocaleString()} 🪙</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <div>Earned: {w.total_earned.toLocaleString()} 🪙</div>
                      <div>Spent: {w.total_spent.toLocaleString()} 🪙</div>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div style={{ marginTop: '0.6rem', height: '5px', borderRadius: '999px', background: 'var(--border-color)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${spendPct}%`, background: isLow ? '#ef4444' : 'linear-gradient(90deg, #7c3aed, #f59e0b)', borderRadius: '999px' }} />
                  </div>
                </div>

                <button onClick={() => { setCreditModal(w); setCreditForm({ coins: '', reason: '' }); }}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #f59e0b)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}>
                  + Credit Coins
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Credit Coins Modal */}
      {creditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '18px', padding: '2rem', width: '100%', maxWidth: '420px', boxShadow: '0 24px 70px rgba(0,0,0,0.4)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.4rem' }}>🪙</div>
              <h3 style={{ margin: 0, fontWeight: 800 }}>Credit Coins</h3>
              <div style={{ color: 'var(--text-muted)', marginTop: '0.4rem', fontSize: '0.9rem' }}>
                To: <strong>{creditModal.student_name}</strong> &nbsp;·&nbsp; Current: <strong style={{ color: '#f59e0b' }}>🪙 {creditModal.coins_balance.toLocaleString()}</strong>
              </div>
            </div>
            <form onSubmit={handleCredit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Quick amount buttons */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Coins to Credit *</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  {[1000, 5000, 10000, 15000].map(amt => (
                    <button key={amt} type='button' onClick={() => setCreditForm({ ...creditForm, coins: String(amt) })}
                      style={{ padding: '0.35rem 0.8rem', borderRadius: '8px', border: `2px solid ${creditForm.coins === String(amt) ? '#7c3aed' : 'var(--border-color)'}`, background: creditForm.coins === String(amt) ? '#7c3aed20' : 'transparent', color: creditForm.coins === String(amt) ? '#7c3aed' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem' }}>
                      🪙 {amt.toLocaleString()}
                    </button>
                  ))}
                </div>
                <input type='number' value={creditForm.coins} onChange={e => setCreditForm({ ...creditForm, coins: e.target.value })} placeholder='Or enter custom amount...' min='1' required
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', boxSizing: 'border-box', fontSize: '1rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Reason</label>
                <input value={creditForm.reason} onChange={e => setCreditForm({ ...creditForm, reason: e.target.value })} placeholder='e.g. Scholarship bonus, Referral reward...'
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
              </div>
              {creditForm.coins && parseInt(creditForm.coins) > 0 && (
                <div style={{ padding: '0.7rem', borderRadius: '10px', background: '#d1fae5', border: '1px solid #6ee7b7', fontSize: '0.83rem', color: '#065f46' }}>
                  After credit: <strong>🪙 {(creditModal.coins_balance + parseInt(creditForm.coins || 0)).toLocaleString()}</strong> coins
                </div>
              )}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type='button' onClick={() => setCreditModal(null)} style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button type='submit' disabled={submitting} style={{ flex: 2, padding: '0.8rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #f59e0b)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                  {submitting ? 'Crediting...' : '🪙 Credit Coins'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
