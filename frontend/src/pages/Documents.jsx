import React, { useState, useEffect } from 'react';
import api from '../services/api';

const DOC_TYPES = ['AADHAAR','PAN_CARD','PASSPORT','MARKSHEET_10TH','MARKSHEET_12TH','DEGREE_CERTIFICATE','PHOTO','OTHER'];
const DOC_LABELS = { AADHAAR: 'Aadhaar Card', PAN_CARD: 'PAN Card', PASSPORT: 'Passport', MARKSHEET_10TH: '10th Marksheet', MARKSHEET_12TH: '12th Marksheet', DEGREE_CERTIFICATE: 'Degree Certificate', PHOTO: 'Passport Photo', OTHER: 'Other Document' };
const STATUS_CONFIG = { PENDING: { color: '#f59e0b', bg: '#fef3c7', icon: '⏳' }, VERIFIED: { color: '#10b981', bg: '#d1fae5', icon: '✅' }, REJECTED: { color: '#ef4444', bg: '#fee2e2', icon: '❌' } };

export default function Documents() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ document_type: 'AADHAAR', document_name: '', file_path: '' });

  const user = JSON.parse(localStorage.getItem('cf_user') || '{}');
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.role);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    api.get('/users?role=STUDENT').then(r => setStudents(r.data?.users || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedStudent) { setDocs([]); return; }
    setLoading(true);
    api.get(`/documents?student_id=${selectedStudent}`)
      .then(r => setDocs(r.data?.documents || []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, [selectedStudent]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post('/documents', { ...form, student_id: selectedStudent });
      showToast('Document added!');
      setShowForm(false);
      const r = await api.get(`/documents?student_id=${selectedStudent}`);
      setDocs(r.data?.documents || []);
    } catch (err) { showToast(err || 'Error', 'error'); }
  };

  const handleVerify = async (docId, status) => {
    const remarks = status === 'REJECTED' ? window.prompt('Reason for rejection (optional):') : null;
    try {
      await api.patch(`/documents/${docId}/verify`, { status, remarks });
      showToast(`Document marked as ${status}`);
      const r = await api.get(`/documents?student_id=${selectedStudent}`);
      setDocs(r.data?.documents || []);
    } catch (err) { showToast(err || 'Error', 'error'); }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Delete this document record?')) return;
    await api.delete(`/documents/${docId}`);
    setDocs(docs.filter(d => d.id !== docId));
    showToast('Deleted');
  };

  const stats = { total: docs.length, verified: docs.filter(d => d.status === 'VERIFIED').length, pending: docs.filter(d => d.status === 'PENDING').length, rejected: docs.filter(d => d.status === 'REJECTED').length };

  return (
    <div style={{ padding: '1.5rem' }}>
      {toast && <div style={{ position: 'fixed', top: '1rem', right: '1rem', padding: '0.85rem 1.4rem', borderRadius: '10px', background: toast.type === 'error' ? '#ef4444' : '#10b981', color: '#fff', fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>{toast.msg}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, background: 'linear-gradient(135deg, #10b981, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>📁 Document Manager</h2>
          <p style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Collect and verify student admission documents</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}
            style={{ padding: '0.6rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', minWidth: '220px' }}>
            <option value=''>— Select Student —</option>
            {students.map(s => <option key={s.id} value={s.student_id || s.id}>{s.full_name} ({s.roll_number || s.email})</option>)}
          </select>
          {selectedStudent && (
            <button onClick={() => setShowForm(true)} style={{ padding: '0.6rem 1.4rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #10b981, #3b82f6)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>+ Add Document</button>
          )}
        </div>
      </div>

      {selectedStudent && docs.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Documents', val: stats.total, color: '#3b82f6', icon: '📋' },
            { label: 'Verified', val: stats.verified, color: '#10b981', icon: '✅' },
            { label: 'Pending', val: stats.pending, color: '#f59e0b', icon: '⏳' },
            { label: 'Rejected', val: stats.rejected, color: '#ef4444', icon: '❌' }
          ].map((s, i) => (
            <div key={i} style={{ padding: '1.2rem', borderRadius: '12px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{s.icon}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {!selectedStudent ? (
        <div style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📂</div>
          <h3 style={{ color: 'var(--text-primary)' }}>Select a Student</h3>
          <p>Choose a student from the dropdown to view and manage their documents.</p>
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading documents...</div>
      ) : docs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
          <p>No documents uploaded for this student yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {docs.map(doc => {
            const cfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.PENDING;
            return (
              <div key={doc.id} style={{ padding: '1.2rem', borderRadius: '14px', background: 'var(--card-bg)', border: `1px solid ${cfg.color}40`, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{doc.document_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{DOC_LABELS[doc.document_type] || doc.document_type}</div>
                  </div>
                  <span style={{ padding: '0.25rem 0.7rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, background: cfg.bg, color: cfg.color }}>
                    {cfg.icon} {doc.status}
                  </span>
                </div>
                {doc.remarks && <div style={{ fontSize: '0.8rem', color: '#f59e0b', marginBottom: '0.5rem', fontStyle: 'italic' }}>Remark: {doc.remarks}</div>}
                {doc.verified_by_name && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Verified by: {doc.verified_by_name}</div>}
                {isAdmin && (
                  <div style={{ marginTop: '0.8rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {doc.status !== 'VERIFIED' && <button onClick={() => handleVerify(doc.id, 'VERIFIED')} style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem', borderRadius: '7px', border: 'none', background: '#d1fae5', color: '#10b981', cursor: 'pointer', fontWeight: 700 }}>✅ Verify</button>}
                    {doc.status !== 'REJECTED' && <button onClick={() => handleVerify(doc.id, 'REJECTED')} style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem', borderRadius: '7px', border: 'none', background: '#fee2e2', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}>❌ Reject</button>}
                    {doc.status !== 'PENDING' && <button onClick={() => handleVerify(doc.id, 'PENDING')} style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem', borderRadius: '7px', border: 'none', background: '#fef3c7', color: '#f59e0b', cursor: 'pointer', fontWeight: 700 }}>⏳ Reset</button>}
                    <button onClick={() => handleDelete(doc.id)} style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem', borderRadius: '7px', border: 'none', background: '#f1f5f9', color: '#64748b', cursor: 'pointer', fontWeight: 700 }}>🗑 Delete</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            <h3 style={{ margin: '0 0 1.5rem', fontWeight: 800 }}>Add Document</h3>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Document Type</label>
                <select value={form.document_type} onChange={e => setForm({ ...form, document_type: e.target.value, document_name: DOC_LABELS[e.target.value] })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
                  {DOC_TYPES.map(t => <option key={t} value={t}>{DOC_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Document Name / Label</label>
                <input value={form.document_name} onChange={e => setForm({ ...form, document_name: e.target.value })} placeholder='e.g. Aadhaar Card - Rahul' required
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>File Path / URL (optional)</label>
                <input value={form.file_path} onChange={e => setForm({ ...form, file_path: e.target.value })} placeholder='e.g. /docs/aadhaar_rahul.pdf'
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type='button' onClick={() => setShowForm(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button type='submit' style={{ flex: 2, padding: '0.75rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #10b981, #3b82f6)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Add Document</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
