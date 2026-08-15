import React, { useState, useEffect } from 'react';
import api from '../services/api';

const TXN_CONFIG = {
  CREDIT: { color: '#10b981', bg: '#d1fae5', icon: '⬆', label: '+' },
  DEBIT:  { color: '#ef4444', bg: '#fee2e2', icon: '⬇', label: '-' }
};

const REASON_ICONS = {
  WELCOME_BONUS: '🎁',
  ENROLLMENT: '📚',
  MANUAL_CREDIT: '💳',
  REFUND: '↩️',
};

export default function Wallet() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/wallet/my')
      .then(r => { setWallet(r.data?.wallet); setTransactions(r.data?.transactions || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const balance = wallet?.coins_balance ?? 0;
  const totalEarned = wallet?.total_earned ?? 0;
  const totalSpent = wallet?.total_spent ?? 0;

  // Progress bar: spent / earned
  const spendPercent = totalEarned > 0 ? Math.min(100, (totalSpent / totalEarned) * 100) : 0;
  const remainPercent = 100 - spendPercent;

  if (loading) return (
    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', paddingTop: '5rem' }}>
      <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🪙</div>
      Loading your wallet...
    </div>
  );

  return (
    <div style={{ padding: '1.5rem', maxWidth: '720px' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, background: 'linear-gradient(135deg, #f59e0b, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🪙 My Coin Wallet
        </h2>
        <p style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Use coins to enroll in courses. New students receive 10,000 welcome coins!</p>
      </div>

      {/* Main Wallet Card */}
      <div style={{ borderRadius: '20px', background: 'linear-gradient(135deg, #7c3aed, #f59e0b)', padding: '2.5rem', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden', color: '#fff', boxShadow: '0 12px 40px rgba(124,58,237,0.35)' }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '30%', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />

        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.8, letterSpacing: '0.1rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Available Balance</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.3rem' }}>
            <span style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-1px' }}>{balance.toLocaleString('en-IN')}</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, opacity: 0.8 }}>🪙</span>
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.75, marginBottom: '1.8rem' }}>≈ ₹{balance.toLocaleString('en-IN')} worth</div>

          {/* Progress bar */}
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', opacity: 0.8, marginBottom: '0.4rem' }}>
              <span>Coins Spent: {totalSpent.toLocaleString()}</span>
              <span>Total Earned: {totalEarned.toLocaleString()}</span>
            </div>
            <div style={{ height: '8px', borderRadius: '999px', background: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${spendPercent}%`, background: 'rgba(255,255,255,0.9)', borderRadius: '999px', transition: 'width 0.6s ease' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Earned', val: totalEarned.toLocaleString('en-IN'), icon: '⬆', color: '#10b981', bg: '#d1fae5' },
          { label: 'Total Spent', val: totalSpent.toLocaleString('en-IN'), icon: '⬇', color: '#ef4444', bg: '#fee2e2' },
          { label: 'Transactions', val: transactions.length, icon: '🔄', color: '#8b5cf6', bg: '#ede9fe' }
        ].map((s, i) => (
          <div key={i} style={{ padding: '1rem', borderRadius: '14px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>{s.icon}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* How Coins Work */}
      <div style={{ padding: '1rem 1.2rem', borderRadius: '12px', background: 'linear-gradient(135deg, #fef3c720, #ede9fe20)', border: '1px solid #f59e0b30', marginBottom: '1.5rem' }}>
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>💡 How Coins Work</div>
        <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
          <div>🎁 <strong>New students</strong> receive <strong>10,000 coins</strong> as a welcome bonus.</div>
          <div>📚 <strong>1 Coin = ₹1</strong> — Coins are deducted automatically when admin approves your enrollment.</div>
          <div>💳 Additional coins can be credited by the admin (scholarships, bonuses, etc.).</div>
        </div>
      </div>

      {/* Transaction History */}
      <div>
        <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem', fontSize: '1rem' }}>📋 Transaction History</div>
        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</div>
            <p>No transactions yet. Enroll in a course to see transactions!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {transactions.map(txn => {
              const cfg = TXN_CONFIG[txn.type];
              const reasonIcon = Object.entries(REASON_ICONS).find(([k]) => txn.reference_type === k)?.[1] || '🪙';
              return (
                <div key={txn.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1.1rem', borderRadius: '12px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                      {reasonIcon}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{txn.reason}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(txn.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: cfg.color }}>
                      {cfg.label}{txn.coins.toLocaleString()} 🪙
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Balance: {txn.balance_after.toLocaleString()}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
