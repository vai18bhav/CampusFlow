import React, { useState, useEffect } from 'react';
import api from '../services/api';

const TYPE_CONFIG = { FULL_TIME: { label: 'Full-Time', color: '#10b981', bg: '#d1fae5' }, PART_TIME: { label: 'Part-Time', color: '#3b82f6', bg: '#dbeafe' }, INTERNSHIP: { label: 'Internship', color: '#8b5cf6', bg: '#ede9fe' }, FREELANCE: { label: 'Freelance', color: '#f59e0b', bg: '#fef3c7' } };

export default function Placements() {
  const [placements, setPlacements] = useState([]);
  const [stats, setStats] = useState({});
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ student_id: '', batch_id: '', course_id: '', company_name: '', job_role: '', ctc_lpa: '', offer_date: '', joining_date: '', placement_type: 'FULL_TIME', notes: '' });

  const user = JSON.parse(localStorage.getItem('cf_user') || '{}');
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.role);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await api.get('/placements');
      setPlacements(r.data?.placements || []);
      setStats(r.data?.stats || {});
    } catch (e) { } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    api.get('/users?role=STUDENT').then(r => setStudents(r.data?.users || [])).catch(() => {});
    api.get('/batches').then(r => setBatches(r.data?.batches || [])).catch(() => {});
    api.get('/courses').then(r => setCourses(r.data?.courses || [])).catch(() => {});
  }, []);

  const openAdd = () => { setEditItem(null); setForm({ student_id: '', batch_id: '', course_id: '', company_name: '', job_role: '', ctc_lpa: '', offer_date: '', joining_date: '', placement_type: 'FULL_TIME', notes: '' }); setShowForm(true); };
  const openEdit = (p) => { setEditItem(p); setForm({ student_id: p.student_id, batch_id: p.batch_id || '', course_id: p.course_id || '', company_name: p.company_name, job_role: p.job_role, ctc_lpa: p.ctc_lpa || '', offer_date: p.offer_date?.split('T')[0] || '', joining_date: p.joining_date?.split('T')[0] || '', placement_type: p.placement_type || 'FULL_TIME', notes: p.notes || '' }); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) { await api.put(`/placements/${editItem.id}`, form); showToast('Placement updated!'); }
      else { await api.post('/placements', form); showToast('Placement recorded!'); }
      setShowForm(false);
      fetchData();
    } catch (err) { showToast(err || 'Error', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this placement record?')) return;
    await api.delete(`/placements/${id}`);
    showToast('Deleted');
    fetchData();
  };

  const filtered = placements.filter(p =>
    p.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.job_role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '1.5rem' }}>
      {toast && <div style={{ position: 'fixed', top: '1rem', right: '1rem', padding: '0.85rem 1.4rem', borderRadius: '10px', background: toast.type === 'error' ? '#ef4444' : '#10b981', color: '#fff', fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>{toast.msg}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>🎓 Placement Tracker</h2>
          <p style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Track student placement outcomes and company records</p>
        </div>
        {isAdmin && <button onClick={openAdd} style={{ padding: '0.6rem 1.4rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>+ Record Placement</button>}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Placed', val: stats.total_placed || 0, icon: '🎯', color: '#10b981' },
          { label: 'Companies', val: stats.unique_companies || 0, icon: '🏢', color: '#3b82f6' },
          { label: 'Avg CTC (LPA)', val: stats.avg_ctc ? `₹${parseFloat(stats.avg_ctc).toFixed(2)}L` : '—', icon: '💰', color: '#8b5cf6' },
          { label: 'Highest CTC', val: stats.highest_ctc ? `₹${stats.highest_ctc}L` : '—', icon: '🏆', color: '#f59e0b' }
        ].map((s, i) => (
          <div key={i} style={{ padding: '1.2rem', borderRadius: '14px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '0.3rem' }}>{s.icon}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.2rem' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder='🔍 Search by student, company, or role...'
          style={{ width: '100%', maxWidth: '400px', padding: '0.7rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading placements...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎓</div>
          <p>No placement records found. Start recording student placements!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {filtered.map(p => {
            const tc = TYPE_CONFIG[p.placement_type] || TYPE_CONFIG.FULL_TIME;
            return (
              <div key={p.id} style={{ padding: '1.4rem', borderRadius: '14px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem' }}>{p.student_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.student_email}</div>
                  </div>
                  <span style={{ padding: '0.3rem 0.8rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, background: tc.bg, color: tc.color }}>{tc.label}</span>
                </div>
                <div style={{ padding: '0.8rem', borderRadius: '10px', background: `linear-gradient(135deg, #f59e0b15, #ef444415)`, marginBottom: '0.8rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>🏢 {p.company_name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>💼 {p.job_role}</div>
                  {p.ctc_lpa && <div style={{ color: '#10b981', fontWeight: 700, fontSize: '0.95rem', marginTop: '0.3rem' }}>💰 ₹{p.ctc_lpa} LPA</div>}
                </div>
                {p.course_name && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>📚 {p.course_name}</div>}
                {p.offer_date && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>📅 Offer: {new Date(p.offer_date).toLocaleDateString('en-IN')}</div>}
                {isAdmin && (
                  <div style={{ marginTop: '0.8rem', display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => openEdit(p)} style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem', borderRadius: '7px', border: 'none', background: '#3b82f620', color: '#3b82f6', cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                    <button onClick={() => handleDelete(p.id)} style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem', borderRadius: '7px', border: 'none', background: '#ef444420', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', overflowY: 'auto' }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '520px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', margin: 'auto' }}>
            <h3 style={{ margin: '0 0 1.5rem', fontWeight: 800 }}>{editItem ? 'Edit' : 'Record'} Placement</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {!editItem && (
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Student *</label>
                  <select value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} required
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
                    <option value=''>— Select Student —</option>
                    {students.map(s => <option key={s.student_id || s.id} value={s.student_id || s.id}>{s.full_name}</option>)}
                  </select>
                </div>
              )}
              {[
                { label: 'Company Name *', key: 'company_name', type: 'text', placeholder: 'e.g. Infosys Ltd.' },
                { label: 'Job Role *', key: 'job_role', type: 'text', placeholder: 'e.g. Full Stack Developer' },
                { label: 'CTC (LPA)', key: 'ctc_lpa', type: 'number', placeholder: 'e.g. 5.5' },
                { label: 'Offer Date', key: 'offer_date', type: 'date' },
                { label: 'Joining Date', key: 'joining_date', type: 'date' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>{f.label}</label>
                  <input type={f.type} value={form[f.key]} placeholder={f.placeholder} onChange={e => setForm({ ...form, [f.key]: e.target.value })} required={f.label.includes('*')}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Placement Type</label>
                <select value={form.placement_type} onChange={e => setForm({ ...form, placement_type: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder='Optional notes...' rows={2}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type='button' onClick={() => setShowForm(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button type='submit' style={{ flex: 2, padding: '0.75rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>{editItem ? 'Update' : 'Record'} Placement</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
