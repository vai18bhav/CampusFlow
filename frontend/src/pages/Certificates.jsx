import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function Certificates() {
  const [certs, setCerts] = useState([]);
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewCert, setViewCert] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ student_id: '', batch_id: '', course_id: '', grade: 'Pass', issued_date: new Date().toISOString().split('T')[0] });

  const user = JSON.parse(localStorage.getItem('cf_user') || '{}');
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.role);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fetchCerts = () => {
    setLoading(true);
    api.get('/certificates').then(r => setCerts(r.data?.certificates || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCerts();
    api.get('/users?role=STUDENT').then(r => setStudents(r.data?.users || [])).catch(() => {});
    api.get('/batches').then(r => setBatches(r.data?.batches || [])).catch(() => {});
    api.get('/courses').then(r => setCourses(r.data?.courses || [])).catch(() => {});
  }, []);

  const handleIssue = async (e) => {
    e.preventDefault();
    try {
      const r = await api.post('/certificates', form);
      showToast(`Certificate issued! #${r.data?.certificate_number}`);
      setShowForm(false);
      fetchCerts();
    } catch (err) { showToast(err || 'Error', 'error'); }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm('Revoke this certificate?')) return;
    await api.patch(`/certificates/${id}/revoke`);
    showToast('Certificate revoked');
    fetchCerts();
  };

  const handlePrint = (cert) => {
    setViewCert(cert);
    setTimeout(() => window.print(), 300);
  };

  const filtered = certs.filter(c =>
    c.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.course_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.certificate_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '1.5rem' }}>
      {toast && <div style={{ position: 'fixed', top: '1rem', right: '1rem', padding: '0.85rem 1.4rem', borderRadius: '10px', background: toast.type === 'error' ? '#ef4444' : '#10b981', color: '#fff', fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>{toast.msg}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, background: 'linear-gradient(135deg, #8b5cf6, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>🏆 Certificates</h2>
          <p style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Issue and manage course completion certificates</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder='🔍 Search certificates...'
            style={{ padding: '0.6rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', minWidth: '200px' }} />
          {isAdmin && <button onClick={() => setShowForm(true)} style={{ padding: '0.6rem 1.4rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #8b5cf6, #f59e0b)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>🏆 Issue Certificate</button>}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading certificates...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏅</div>
          <h3 style={{ color: 'var(--text-primary)' }}>No Certificates Issued Yet</h3>
          <p>Issue course completion certificates to your students!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.2rem' }}>
          {filtered.map(cert => (
            <div key={cert.id} style={{ padding: '1.5rem', borderRadius: '16px', background: cert.status === 'REVOKED' ? 'var(--card-bg)' : 'linear-gradient(135deg, var(--card-bg), #f5f3ff)', border: cert.status === 'REVOKED' ? '1px solid #ef444440' : '1px solid #8b5cf640', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', opacity: cert.status === 'REVOKED' ? 0.6 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.7rem', borderRadius: '999px', background: cert.status === 'ISSUED' ? '#d1fae5' : '#fee2e2', color: cert.status === 'ISSUED' ? '#10b981' : '#ef4444' }}>
                  {cert.status === 'ISSUED' ? '✅ ISSUED' : '❌ REVOKED'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{cert.certificate_number}</span>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>{cert.student_name}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>📚 {cert.course_name}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>🎓 {cert.batch_name} ({cert.batch_code})</div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <span>📅 {new Date(cert.issued_date).toLocaleDateString('en-IN')}</span>
                <span style={{ padding: '0.15rem 0.6rem', borderRadius: '999px', background: '#8b5cf620', color: '#8b5cf6', fontWeight: 700 }}>Grade: {cert.grade}</span>
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button onClick={() => setViewCert(cert)} style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem', borderRadius: '8px', border: 'none', background: '#8b5cf620', color: '#8b5cf6', cursor: 'pointer', fontWeight: 600 }}>👁 View</button>
                <button onClick={() => handlePrint(cert)} style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem', borderRadius: '8px', border: 'none', background: '#3b82f620', color: '#3b82f6', cursor: 'pointer', fontWeight: 600 }}>🖨 Print</button>
                {isAdmin && cert.status === 'ISSUED' && <button onClick={() => handleRevoke(cert.id)} style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem', borderRadius: '8px', border: 'none', background: '#ef444420', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}>Revoke</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Issue Form */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '460px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            <h3 style={{ margin: '0 0 1.5rem', fontWeight: 800 }}>🏆 Issue New Certificate</h3>
            <form onSubmit={handleIssue} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { label: 'Student *', key: 'student_id', type: 'select', options: [{ value: '', label: '— Select Student —' }, ...students.map(s => ({ value: s.student_id || s.id, label: s.full_name }))] },
                { label: 'Batch *', key: 'batch_id', type: 'select', options: [{ value: '', label: '— Select Batch —' }, ...batches.map(b => ({ value: b.id, label: `${b.name} (${b.batch_code})` }))] },
                { label: 'Course *', key: 'course_id', type: 'select', options: [{ value: '', label: '— Select Course —' }, ...courses.map(c => ({ value: c.id, label: c.name }))] },
                { label: 'Grade', key: 'grade', type: 'select', options: [{ value: 'Pass', label: 'Pass' }, { value: 'Distinction', label: 'Distinction' }, { value: 'Merit', label: 'Merit' }, { value: 'First Class', label: 'First Class' }] },
                { label: 'Issue Date', key: 'issued_date', type: 'date' }
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>{f.label}</label>
                  {f.type === 'select' ? (
                    <select value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} required={f.label.includes('*')}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
                      {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input type={f.type} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} required={f.label.includes('*')}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type='button' onClick={() => setShowForm(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button type='submit' style={{ flex: 2, padding: '0.75rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #8b5cf6, #f59e0b)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Issue Certificate</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Certificate Viewer / Printable */}
      {viewCert && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '700px', overflow: 'hidden', boxShadow: '0 20px 80px rgba(0,0,0,0.6)' }}>
            {/* Certificate Design */}
            <div id='cert-print' style={{ padding: '3rem', background: 'linear-gradient(135deg, #faf5ff, #fff7ed)', position: 'relative', textAlign: 'center', fontFamily: '"Georgia", serif' }}>
              <div style={{ position: 'absolute', inset: '12px', border: '3px solid #8b5cf680', borderRadius: '12px', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', inset: '18px', border: '1px solid #f59e0b50', borderRadius: '10px', pointerEvents: 'none' }} />
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏆</div>
              <div style={{ fontSize: '0.8rem', letterSpacing: '0.3rem', color: '#8b5cf6', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>CampusFlow Training Institute</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1e1b4b', marginBottom: '0.3rem' }}>Certificate of Completion</div>
              <div style={{ width: '80px', height: '3px', background: 'linear-gradient(90deg, #8b5cf6, #f59e0b)', margin: '0.8rem auto' }} />
              <div style={{ color: '#6b7280', fontSize: '0.95rem', marginBottom: '1.5rem' }}>This is to certify that</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#8b5cf6', fontStyle: 'italic', marginBottom: '0.5rem' }}>{viewCert.student_name}</div>
              <div style={{ color: '#6b7280', fontSize: '0.95rem', marginBottom: '0.5rem' }}>has successfully completed the course</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e1b4b', marginBottom: '0.3rem' }}>"{viewCert.course_name}"</div>
              <div style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Batch: {viewCert.batch_name} ({viewCert.batch_code})</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>{viewCert.grade}</div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1rem' }}>Grade</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#8b5cf6' }}>{new Date(viewCert.issued_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1rem' }}>Issued On</div>
                </div>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontFamily: 'monospace' }}>Certificate No: {viewCert.certificate_number}</div>
              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', borderTop: '1px dashed #e5e7eb', paddingTop: '1rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '120px', borderTop: '2px solid #374151', paddingTop: '0.4rem', fontSize: '0.8rem', color: '#374151', fontWeight: 700 }}>{viewCert.issued_by_name || 'Director'}</div>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Authorized Signature</div>
                </div>
              </div>
            </div>
            <div style={{ padding: '1rem', background: '#f8fafc', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={() => setViewCert(null)} style={{ padding: '0.6rem 1.5rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Close</button>
              <button onClick={() => window.print()} style={{ padding: '0.6rem 1.5rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #8b5cf6, #f59e0b)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>🖨 Print Certificate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
