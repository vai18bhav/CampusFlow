import React, { useState, useEffect } from 'react';
import api from '../services/api';

const STATUS_CONFIG = {
  PENDING:  { color: '#f59e0b', bg: '#fef3c7', icon: '⏳', label: 'Pending' },
  APPROVED: { color: '#10b981', bg: '#d1fae5', icon: '✅', label: 'Approved' },
  REJECTED: { color: '#ef4444', bg: '#fee2e2', icon: '❌', label: 'Rejected' }
};

export default function CourseEnroll() {
  const [courses, setCourses] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(null); // course to enroll in
  const [message, setMessage] = useState('');

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, rRes] = await Promise.all([
        api.get('/courses'),
        api.get('/enrollments')
      ]);
      setCourses(cRes.data?.courses || []);
      setMyRequests(rRes.data?.requests || []);
    } catch (e) { }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getRequestStatus = (courseId) => myRequests.find(r => r.course_id === courseId);

  const handleEnrollSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(showModal.id);
    try {
      await api.post('/enrollments', { course_id: showModal.id, message });
      showToast(`✅ Enrollment request sent for "${showModal.name}"! Admin will review shortly.`);
      setShowModal(null);
      setMessage('');
      fetchData();
    } catch (err) {
      showToast(err || 'Failed to submit request', 'error');
    }
    setSubmitting(null);
  };

  const filtered = courses.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.category?.toLowerCase().includes(search.toLowerCase()) ||
    c.code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '1.5rem' }}>
      {toast && (
        <div style={{ position: 'fixed', top: '1rem', right: '1rem', padding: '0.85rem 1.4rem', borderRadius: '10px', background: toast.type === 'error' ? '#ef4444' : '#10b981', color: '#fff', fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', maxWidth: '380px' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, background: 'linear-gradient(135deg, #3b82f6, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          📚 Enroll in a Course
        </h2>
        <p style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Browse available courses and submit your enrollment request. Admin approval required.</p>
      </div>

      {/* My Requests Summary */}
      {myRequests.length > 0 && (
        <div style={{ marginBottom: '1.5rem', padding: '1.2rem 1.5rem', borderRadius: '14px', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.8rem', fontSize: '0.95rem' }}>📋 My Enrollment Requests</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {myRequests.map(req => {
              const cfg = STATUS_CONFIG[req.status];
              return (
                <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 1rem', borderRadius: '10px', background: cfg.bg, flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{req.course_name}</div>
                    {req.batch_name && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Batch: {req.batch_name}</div>}
                    {req.admin_remarks && <div style={{ fontSize: '0.78rem', color: '#6b7280', fontStyle: 'italic' }}>Admin: {req.admin_remarks}</div>}
                  </div>
                  <span style={{ padding: '0.3rem 0.9rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}>
                    {cfg.icon} {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: '1.2rem' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder='🔍 Search courses by name, category...'
          style={{ width: '100%', maxWidth: '400px', padding: '0.7rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading courses...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.2rem' }}>
          {filtered.map(course => {
            const existing = getRequestStatus(course.id);
            const cfg = existing ? STATUS_CONFIG[existing.status] : null;

            return (
              <div key={course.id} style={{ borderRadius: '16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', transition: 'transform 0.15s, box-shadow 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}>
                {/* Card Top Gradient */}
                <div style={{ height: '6px', background: 'linear-gradient(90deg, #3b82f6, #10b981)' }} />
                <div style={{ padding: '1.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '0.2rem' }}>{course.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{course.code}</div>
                    </div>
                    <span style={{ padding: '0.2rem 0.7rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, background: '#3b82f615', color: '#3b82f6' }}>{course.category}</span>
                  </div>

                  {course.description && (
                    <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '0.8rem', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {course.description}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>
                    <span>⏱ {course.duration_weeks} weeks</span>
                    <span style={{ fontWeight: 700, color: '#10b981' }}>₹{parseFloat(course.fee_amount || 0).toLocaleString('en-IN')}</span>
                  </div>

                  {existing ? (
                    <div style={{ padding: '0.6rem 1rem', borderRadius: '10px', background: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: '0.85rem', textAlign: 'center' }}>
                      {cfg.icon} {cfg.label === 'Approved' ? 'Enrolled ✓' : `Request ${cfg.label}`}
                      {existing.batch_name && <div style={{ fontSize: '0.78rem', fontWeight: 400, marginTop: '0.2rem' }}>Batch: {existing.batch_name}</div>}
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowModal(course)}
                      disabled={submitting === course.id}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #3b82f6, #10b981)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', transition: 'opacity 0.2s' }}>
                      {submitting === course.id ? 'Submitting...' : '📩 Request Enrollment'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Enrollment Request Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '18px', padding: '2rem', width: '100%', maxWidth: '480px', boxShadow: '0 24px 70px rgba(0,0,0,0.4)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📩</div>
              <h3 style={{ margin: 0, fontWeight: 800, color: 'var(--text-primary)' }}>Request Enrollment</h3>
              <div style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', borderRadius: '10px', background: '#3b82f610', color: '#3b82f6', fontWeight: 700, fontSize: '0.9rem', display: 'inline-block' }}>
                {showModal.name}
              </div>
            </div>

            <div style={{ padding: '0.9rem 1rem', borderRadius: '12px', background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color)', marginBottom: '1.2rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <span>⏱ <strong>{showModal.duration_weeks} weeks</strong></span>
                <span>💰 <strong style={{ color: '#10b981' }}>₹{parseFloat(showModal.fee_amount || 0).toLocaleString('en-IN')}</strong></span>
              </div>
            </div>

            <form onSubmit={handleEnrollSubmit}>
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Why do you want to join this course? <span style={{ color: '#94a3b8' }}>(optional)</span></label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder='e.g. I want to build my career in web development...' rows={4}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', resize: 'vertical', boxSizing: 'border-box', fontSize: '0.9rem' }} />
              </div>

              <div style={{ padding: '0.75rem', borderRadius: '10px', background: '#fef3c7', border: '1px solid #fcd34d', marginBottom: '1.2rem', fontSize: '0.82rem', color: '#92400e' }}>
                ⏳ <strong>Note:</strong> Your request will be sent to the admin for review. You'll receive an email notification once it's approved or rejected.
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type='button' onClick={() => setShowModal(null)} style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button type='submit' style={{ flex: 2, padding: '0.8rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #3b82f6, #10b981)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>📩 Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
