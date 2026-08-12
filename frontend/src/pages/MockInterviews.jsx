import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import { useAuth } from '../context/AuthContext';

const MockInterviews = () => {
  const { role } = useAuth();
  const [interviews, setInterviews] = useState([]);
  const [students, setStudents] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);

  const [scheduleData, setScheduleData] = useState({
    student_id: '',
    trainer_id: '',
    topic: 'Full Stack System Architecture & Technical Fundamentals',
    scheduled_date: ''
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
      const [resI, resS, resT] = await Promise.all([
        api.get('/mock-interviews'),
        api.get('/users/students'),
        api.get('/users/trainers')
      ]);

      if (resI.success) setInterviews(resI.data.interviews);
      if (resS.success) setStudents(resS.data.students);
      if (resT.success) setTrainers(resT.data.trainers);
    } catch (err) {
      console.error('Failed to load mock interviews');
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/mock-interviews/schedule', scheduleData);
      if (res.success) {
        setShowScheduleModal(false);
        fetchData();
      }
    } catch (err) {
      alert(typeof err === 'string' ? err : 'Schedule failed');
    }
  };

  const handleEvaluate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/mock-interviews/${selectedInterview.id}/evaluate`, evalData);
      if (res.success) {
        setShowEvalModal(false);
        fetchData();
      }
    } catch (err) {
      alert(typeof err === 'string' ? err : 'Evaluation failed');
    }
  };

  const columns = [
    { header: 'Scheduled Time', accessor: 'scheduled_date', render: (r) => <span className="fw-semibold small">{r.scheduled_date?.replace('T', ' ')}</span> },
    { header: 'Student Name', accessor: 'student_name', render: (r) => <span className="fw-bold text-dark">{r.student_name} ({r.roll_number})</span> },
    { header: 'Interviewer', accessor: 'trainer_name' },
    { header: 'Interview Topic', accessor: 'topic' },
    { header: 'Score', accessor: 'score', render: (r) => (r.score !== null ? <span className="fw-bold text-success fs-6">{r.score}/100</span> : <span className="text-muted small">Not Evaluated</span>) },
    { header: 'Status', accessor: 'status', render: (r) => <span className={`cf-badge cf-badge-${r.status.toLowerCase()}`}>{r.status}</span> },
    { header: 'Action', accessor: 'id', render: (r) => (
        ['SUPER_ADMIN', 'ADMIN', 'TRAINER'].includes(role) && r.status === 'SCHEDULED' ? (
          <button className="btn btn-sm btn-outline-success rounded-pill" onClick={() => { setSelectedInterview(r); setShowEvalModal(true); }}>
            <i className="bi bi-star-fill me-1"></i> Grade Candidate
          </button>
        ) : (
          <span className="text-muted small">View Feedback</span>
        )
      )
    }
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1">Mock Technical Interviews</h3>
          <p className="text-muted mb-0">Schedule 1-on-1 technical mock interviews, evaluate readiness, and publish scorecards.</p>
        </div>

        {['SUPER_ADMIN', 'ADMIN', 'TRAINER'].includes(role) && (
          <button className="btn btn-primary rounded-pill px-3 shadow-sm" onClick={() => setShowScheduleModal(true)}>
            <i className="bi bi-calendar-plus-fill me-1"></i> Schedule Interview
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : (
        <DataTable columns={columns} data={interviews} searchKey="topic" title="Interview Schedule & Feedback" />
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">Schedule Mock Interview</h5>
                <button type="button" className="btn-close" onClick={() => setShowScheduleModal(false)}></button>
              </div>
              <form onSubmit={handleSchedule}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Select Student</label>
                    <select className="form-select" value={scheduleData.student_id} onChange={e => setScheduleData({ ...scheduleData, student_id: e.target.value })} required>
                      <option value="">-- Choose Candidate --</option>
                      {students.map(s => <option key={s.student_id} value={s.student_id}>{s.full_name} ({s.roll_number})</option>)}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Assigned Interviewer</label>
                    <select className="form-select" value={scheduleData.trainer_id} onChange={e => setScheduleData({ ...scheduleData, trainer_id: e.target.value })}>
                      <option value="">-- Choose Trainer --</option>
                      {trainers.map(t => <option key={t.trainer_id} value={t.trainer_id}>{t.full_name} ({t.specialization})</option>)}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Topic / Domain Focus</label>
                    <input type="text" className="form-control" value={scheduleData.topic} onChange={e => setScheduleData({ ...scheduleData, topic: e.target.value })} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Date & Time</label>
                    <input type="datetime-local" className="form-control" value={scheduleData.scheduled_date} onChange={e => setScheduleData({ ...scheduleData, scheduled_date: e.target.value })} required />
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-light rounded-pill" onClick={() => setShowScheduleModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4">Schedule Interview</button>
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
