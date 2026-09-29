import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import { useAuth } from '../context/AuthContext';

const MockInterviews = () => {
  const { role, user } = useAuth();
  const [interviews, setInterviews] = useState([]);
  const [students, setStudents] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [mockCredits, setMockCredits] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  const isStudent = role === 'STUDENT';

  const [scheduleData, setScheduleData] = useState({
    student_id: '',
    trainer_id: '',
    topic: 'Full Stack System Architecture & Technical Fundamentals',
    scheduled_date: '',
    preferred_slot: 'Morning (10:00 AM - 12:00 PM)',
    remarks: ''
  });

  const [creditData, setCreditData] = useState({
    student_id: '',
    credits: 3,
    expiry_date: ''
  });

  const [evalData, setEvalData] = useState({
    score: 85,
    feedback: 'Good problem-solving ability and JavaScript core concepts.',
    key_strengths: 'Data structures, REST APIs',
    areas_for_improvement: 'SQL Join optimizations'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const requests = [
        api.get('/mock-interviews'),
        api.get('/users/trainers')
      ];

      if (!isStudent) {
        requests.push(api.get('/users/students'));
      } else {
        requests.push(api.get('/mock-interviews/credits'));
      }

      const results = await Promise.all(requests);
      if (results[0]?.success) setInterviews(results[0].data.interviews || []);
      if (results[1]?.success) setTrainers(results[1].data.trainers || []);

      if (!isStudent && results[2]?.success) {
        setStudents(results[2].data.students || []);
      } else if (isStudent && results[2]?.success) {
        setMockCredits(results[2].data);
      }
    } catch (err) {
      console.error('Failed to load mock interviews data');
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setActionError('');
    try {
      let res;
      if (isStudent) {
        res = await api.post('/mock-interviews/request', {
          topic: scheduleData.topic,
          scheduled_date: scheduleData.scheduled_date,
          trainer_id: scheduleData.trainer_id || null,
          preferred_slot: scheduleData.preferred_slot,
          remarks: scheduleData.remarks
        });
      } else {
        res = await api.post('/mock-interviews/request', scheduleData);
      }

      if (res.success) {
        setShowScheduleModal(false);
        fetchData();
      }
    } catch (err) {
      setActionError(typeof err === 'string' ? err : 'Schedule request failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignCredits = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setActionError('');
    try {
      const res = await api.post('/mock-interviews/assign-credits', creditData);
      if (res.success) {
        setShowCreditModal(false);
        fetchData();
      }
    } catch (err) {
      setActionError(typeof err === 'string' ? err : 'Credit assignment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEvaluate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setActionError('');
    try {
      const res = await api.put(`/mock-interviews/${selectedInterview.id}/evaluate`, evalData);
      if (res.success) {
        setShowEvalModal(false);
        fetchData();
      }
    } catch (err) {
      setActionError(typeof err === 'string' ? err : 'Evaluation submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { header: 'Scheduled Time', accessor: 'scheduled_date', render: (r) => <span className="fw-semibold small">{r.scheduled_date?.replace('T', ' ')}</span> },
    { header: 'Student Name', accessor: 'student_name', render: (r) => <span className="fw-bold text-dark">{r.student_name} ({r.roll_number || 'STU'})</span> },
    { header: 'Interviewer', accessor: 'trainer_name', render: (r) => r.trainer_name || <span className="text-muted small">Assigned Faculty</span> },
    { header: 'Interview Topic', accessor: 'topic' },
    { header: 'Score', accessor: 'score', render: (r) => (r.score !== null ? <span className="fw-bold text-success fs-6">{r.score}/100</span> : <span className="text-muted small">Not Evaluated</span>) },
    { header: 'Status', accessor: 'status', render: (r) => <span className={`cf-badge cf-badge-${(r.status || 'pending').toLowerCase()}`}>{r.status}</span> },
    { header: 'Action', accessor: 'id', render: (r) => (
        ['SUPER_ADMIN', 'ADMIN', 'TRAINER'].includes(role) && r.status === 'SCHEDULED' ? (
          <button className="btn btn-sm btn-outline-success rounded-pill" onClick={() => { setSelectedInterview(r); setShowEvalModal(true); }}>
            <i className="bi bi-star-fill me-1"></i> Grade Candidate
          </button>
        ) : (
          <span className="text-muted small">View Details</span>
        )
      )
    }
  ];

  return (
    <div>
      {/* Student Credit Balance Top Banner */}
      {isStudent && mockCredits && (
        <div className="cf-card p-4 mb-4 bg-primary bg-opacity-10 border border-primary border-opacity-25 rounded-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="badge bg-primary px-3 py-1.5 rounded-pill font-monospace fw-bold">
                  <i className="bi bi-shield-check me-1"></i> MOCK INTERVIEW CREDITS
                </span>
              </div>
              <h4 className="fw-extrabold text-dark mb-1">
                Available Credits: <span className="text-primary">{mockCredits.remaining ?? 0}</span> / {mockCredits.total ?? 0}
              </h4>
              <p className="text-muted small mb-0">
                Each mock interview session consumes 1 credit. {mockCredits.expiry ? `Credits valid until ${mockCredits.expiry.split('T')[0]}.` : ''}
              </p>
            </div>

            <button
              className="btn btn-primary rounded-pill px-4 shadow fw-bold text-nowrap"
              onClick={() => { setActionError(''); setShowScheduleModal(true); }}
              disabled={mockCredits.remaining <= 0}
            >
              <i className="bi bi-calendar-plus-fill me-1.5"></i> Request Mock Interview Session
            </button>
          </div>
        </div>
      )}

      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1">Mock Technical Interviews</h3>
          <p className="text-muted mb-0">Schedule 1-on-1 technical mock interviews, evaluate readiness, and publish scorecards.</p>
        </div>

        <div className="d-flex gap-2">
          {['SUPER_ADMIN', 'ADMIN'].includes(role) && (
            <button className="btn btn-outline-primary rounded-pill px-3 shadow-sm" onClick={() => { setActionError(''); setShowCreditModal(true); }}>
              <i className="bi bi-plus-circle-fill me-1"></i> Assign Credits
            </button>
          )}

          {['SUPER_ADMIN', 'ADMIN', 'TRAINER'].includes(role) && (
            <button className="btn btn-primary rounded-pill px-3 shadow-sm" onClick={() => { setActionError(''); setShowScheduleModal(true); }}>
              <i className="bi bi-calendar-plus-fill me-1"></i> Schedule Interview
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : (
        <DataTable columns={columns} data={interviews} searchKey="topic" title="Interview Schedule & Feedback" />
      )}

      {/* Schedule / Request Modal */}
      {showScheduleModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">{isStudent ? 'Request Mock Technical Interview' : 'Schedule Mock Technical Interview'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowScheduleModal(false)}></button>
              </div>
              <form onSubmit={handleSchedule}>
                <div className="modal-body">
                  {actionError && (
                    <div className="alert alert-danger py-2 px-3 small rounded-3 mb-3">
                      <i className="bi bi-exclamation-octagon-fill me-1"></i> {actionError}
                    </div>
                  )}

                  {!isStudent && (
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Select Student Candidate *</label>
                      <select className="form-select" value={scheduleData.student_id} onChange={e => setScheduleData({ ...scheduleData, student_id: e.target.value })} required>
                        <option value="">-- Choose Candidate --</option>
                        {students.map(s => <option key={s.student_id} value={s.student_id}>{s.full_name} ({s.roll_number || 'STU'})</option>)}
                      </select>
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Interview Topic / Domain Focus *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. React JS Core, System Design, Data Structures"
                      value={scheduleData.topic}
                      onChange={e => setScheduleData({ ...scheduleData, topic: e.target.value })}
                      required
                    />
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Preferred Trainer (Optional)</label>
                      <select className="form-select" value={scheduleData.trainer_id} onChange={e => setScheduleData({ ...scheduleData, trainer_id: e.target.value })}>
                        <option value="">-- Any Available Faculty Trainer --</option>
                        {trainers.map(t => <option key={t.trainer_id} value={t.trainer_id}>{t.full_name} ({t.specialization || 'Faculty'})</option>)}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Scheduled Date & Time *</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={scheduleData.scheduled_date}
                        onChange={e => setScheduleData({ ...scheduleData, scheduled_date: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {isStudent && (
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Preferred Timing Slot</label>
                      <select className="form-select" value={scheduleData.preferred_slot} onChange={e => setScheduleData({ ...scheduleData, preferred_slot: e.target.value })}>
                        <option value="Morning (10:00 AM - 12:00 PM)">Morning Slot (10:00 AM - 12:00 PM)</option>
                        <option value="Afternoon (02:00 PM - 04:00 PM)">Afternoon Slot (02:00 PM - 04:00 PM)</option>
                        <option value="Evening (05:00 PM - 07:00 PM)">Evening Slot (05:00 PM - 07:00 PM)</option>
                      </select>
                    </div>
                  )}

                  <div className="mb-2">
                    <label className="form-label small fw-semibold">Remarks / Preparation Notes</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="Enter specific topics you want evaluated or resume links..."
                      value={scheduleData.remarks}
                      onChange={e => setScheduleData({ ...scheduleData, remarks: e.target.value })}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-light rounded-pill" onClick={() => setShowScheduleModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4" disabled={submitting}>
                    {submitting ? 'Submitting...' : isStudent ? 'Submit Request (1 Credit)' : 'Schedule Interview'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Credit Assignment Modal (Admin) */}
      {showCreditModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">Assign Mock Interview Credits</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreditModal(false)}></button>
              </div>
              <form onSubmit={handleAssignCredits}>
                <div className="modal-body">
                  {actionError && (
                    <div className="alert alert-danger py-2 px-3 small rounded-3 mb-3">
                      <i className="bi bi-exclamation-octagon-fill me-1"></i> {actionError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Select Student Candidate *</label>
                    <select className="form-select" value={creditData.student_id} onChange={e => setCreditData({ ...creditData, student_id: e.target.value })} required>
                      <option value="">-- Choose Student --</option>
                      {students.map(s => <option key={s.student_id} value={s.student_id}>{s.full_name} ({s.roll_number || 'STU'})</option>)}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Credits Amount *</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={creditData.credits}
                      onChange={e => setCreditData({ ...creditData, credits: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Expiry Date (Optional)</label>
                    <input
                      type="date"
                      className="form-control"
                      value={creditData.expiry_date}
                      onChange={e => setCreditData({ ...creditData, expiry_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-light rounded-pill" onClick={() => setShowCreditModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4" disabled={submitting}>
                    {submitting ? 'Assigning...' : 'Assign Credits'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Evaluate Modal */}
      {showEvalModal && selectedInterview && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">Evaluate Candidate: {selectedInterview.student_name}</h5>
                <button type="button" className="btn-close" onClick={() => setShowEvalModal(false)}></button>
              </div>
              <form onSubmit={handleEvaluate}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Overall Technical Score (0-100)</label>
                    <input type="number" min="0" max="100" className="form-control" value={evalData.score} onChange={e => setEvalData({ ...evalData, score: e.target.value })} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Key Technical Strengths</label>
                    <textarea className="form-control" rows="2" value={evalData.key_strengths} onChange={e => setEvalData({ ...evalData, key_strengths: e.target.value })}></textarea>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Areas for Improvement</label>
                    <textarea className="form-control" rows="2" value={evalData.areas_for_improvement} onChange={e => setEvalData({ ...evalData, areas_for_improvement: e.target.value })}></textarea>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Detailed Feedback & Recommendations</label>
                    <textarea className="form-control" rows="3" value={evalData.feedback} onChange={e => setEvalData({ ...evalData, feedback: e.target.value })} required></textarea>
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-light rounded-pill" onClick={() => setShowEvalModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-success rounded-pill px-4">Submit Evaluation</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MockInterviews;
