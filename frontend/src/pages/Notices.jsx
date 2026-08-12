import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Notices = () => {
  const { role } = useAuth();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 'GENERAL',
    target_group: 'ALL_STUDENTS'
  });

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      const res = await api.get('/notifications/notices');
      if (res.success) {
        setNotices(res.data.notices || []);
      }
    } catch (err) {
      console.error('Failed to load notices feed');
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcastNotice = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await api.post('/notifications/broadcast-notice', formData);
      if (res.success) {
        setSuccessMsg(res.message || 'Notice broadcasted successfully! In-app notifications & Gmail emails sent.');
        setFormData({ title: '', message: '', priority: 'GENERAL', target_group: 'ALL_STUDENTS' });
        fetchNotices();
      }
    } catch (err) {
      setErrorMsg(typeof err === 'string' ? err : 'Notice broadcast failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderPriorityBadge = (priority) => {
    switch (priority) {
      case 'URGENT':
        return <span className="badge bg-danger bg-opacity-20 text-danger border border-danger border-opacity-25 px-2.5 py-1 rounded-pill"><i className="bi bi-exclamation-triangle-fill me-1"></i> URGENT</span>;
      case 'IMPORTANT':
        return <span className="badge bg-warning bg-opacity-20 text-warning border border-warning border-opacity-25 px-2.5 py-1 rounded-pill"><i className="bi bi-star-fill me-1"></i> IMPORTANT</span>;
      default:
        return <span className="badge bg-primary bg-opacity-20 text-primary border border-primary border-opacity-25 px-2.5 py-1 rounded-pill"><i className="bi bi-info-circle-fill me-1"></i> GENERAL</span>;
    }
  };

  return (
    <div className="cf-page-enter">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h3 className="fw-extrabold mb-1">Campus Notice Board & Broadcast Center</h3>
          <p className="text-muted mb-0">Official institutional announcements, exam schedules, and instant email broadcasts.</p>
        </div>
      </div>

      <div className="row g-4">
        {/* Broadcast Form Panel (Super Admin & Admin Only) */}
        {['SUPER_ADMIN', 'ADMIN'].includes(role) && (
          <div className="col-lg-5">
            <div className="cf-card p-4 shadow-sm">
              <h5 className="fw-bold mb-3">
                <i className="bi bi-megaphone-fill text-warning me-2"></i>Broadcast Official Notice
              </h5>
              <p className="text-muted small mb-3">
                Publishing a notice automatically creates in-app notifications and sends formatted Gmail email alerts to all target recipients.
              </p>

              {successMsg && (
                <div className="alert alert-success py-2.5 px-3 small rounded-3 mb-3">
                  <i className="bi bi-check-circle-fill me-1.5"></i> {successMsg}
                </div>
              )}

              {errorMsg && (
                <div className="alert alert-danger py-2.5 px-3 small rounded-3 mb-3">
                  <i className="bi bi-exclamation-octagon-fill me-1.5"></i> {errorMsg}
                </div>
              )}

              <form onSubmit={handleBroadcastNotice}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-muted">Notice Title</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. End Semester Exam Schedule & Lab Guidelines"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted">Target Audience</label>
                    <select
                      className="form-select"
                      value={formData.target_group}
                      onChange={(e) => setFormData({ ...formData, target_group: e.target.value })}
                    >
                      <option value="ALL_STUDENTS">All Active Students</option>
                      <option value="ALL_MEMBERS">All System Members (Staff & Students)</option>
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted">Priority Level</label>
                    <select
                      className="form-select"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    >
                      <option value="GENERAL">General Notice 🔵</option>
                      <option value="IMPORTANT">Important 🟡</option>
                      <option value="URGENT">Urgent Alert 🔴</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label small fw-semibold text-muted">Notice Announcement Content</label>
                  <textarea
                    className="form-control"
                    rows="5"
                    placeholder="Write detailed notice information here..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="btn btn-warning text-dark fw-extrabold w-100 rounded-pill py-2.5 shadow"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Broadcasting & Sending Emails...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send-fill me-1.5"></i> Broadcast Notice & Send Emails 🚀
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Notices History Feed */}
        <div className={['SUPER_ADMIN', 'ADMIN'].includes(role) ? 'col-lg-7' : 'col-12'}>
          <div className="cf-card p-4 shadow-sm h-100">
            <h5 className="fw-bold mb-3">
              <i className="bi bi-journal-text text-primary me-2"></i>Official Announcement Feed
            </h5>

            {loading ? (
              <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
            ) : notices.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-inbox fs-1 d-block mb-2 text-muted"></i>
                No broadcast notices published yet.
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {notices.map((n) => (
                  <div key={n.id} className="p-3.5 rounded-3 border border-secondary border-opacity-25 bg-secondary bg-opacity-10">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="fw-extrabold mb-0">{n.title}</h6>
                      <span className="small text-muted font-monospace">{n.created_at?.split('T')[0]}</span>
                    </div>
                    <p className="text-muted small mb-0" style={{ lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                      {n.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notices;
