import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import DashboardCard from '../components/common/DashboardCard';
import { useAuth } from '../context/AuthContext';

const Assignments = () => {
  const { role, user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissionsList, setSubmissionsList] = useState([]);
  const [evaluatingSub, setEvaluatingSub] = useState(null);
  const [evalMarks, setEvalMarks] = useState('');
  const [evalFeedback, setEvalFeedback] = useState('');

  const isTrainerOrAdmin = ['SUPER_ADMIN', 'ADMIN', 'TRAINER'].includes(role);

  const [createData, setCreateData] = useState({
    batch_id: '',
    title: '',
    description: '',
    instructions: '',
    due_date: '',
    total_marks: 100,
    file_url: '',
    status: 'PUBLISHED'
  });

  const [submitData, setSubmitData] = useState({
    submission_text: '',
    submission_url: '',
    file_url: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, [batchFilter, statusFilter]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      let queryParams = [];
      if (batchFilter) queryParams.push(`batch_id=${encodeURIComponent(batchFilter)}`);
      if (statusFilter) queryParams.push(`status=${encodeURIComponent(statusFilter)}`);
      if (searchTerm) queryParams.push(`search=${encodeURIComponent(searchTerm)}`);

      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

      const [resA, resB] = await Promise.all([
        api.get(`/assignments${queryString}`),
        api.get('/batches')
      ]);

      if (resA.success) setAssignments(resA.data.assignments || []);
      if (resB.success) setBatches(resB.data.batches || []);
    } catch (err) {
      console.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchInitialData();
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/assignments', createData);
      if (res.success) {
        setShowCreateModal(false);
        setCreateData({ batch_id: '', title: '', description: '', instructions: '', due_date: '', total_marks: 100, file_url: '', status: 'PUBLISHED' });
        fetchInitialData();
      }
    } catch (err) {
      alert(typeof err === 'string' ? err : 'Assignment creation failed');
    }
  };

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!submitData.submission_url && !submitData.file_url && !submitData.submission_text) {
      return alert('Please provide at least a Project Link (URL), PDF Document, or Solution Text.');
    }

    try {
      const res = await api.post(`/assignments/${selectedAssignment.id}/submit`, {
        assignment_id: selectedAssignment.id,
        ...submitData
      });
      if (res.success) {
        setShowSubmitModal(false);
        setSubmitData({ submission_text: '', submission_url: '', file_url: '' });
        fetchInitialData();
      }
    } catch (err) {
      alert(typeof err === 'string' ? err : 'Submission failed');
    }
  };

  const handleViewSubmissions = async (assignment) => {
    setSelectedAssignment(assignment);
    try {
      const res = await api.get(`/assignments/${assignment.id}/submissions`);
      if (res.success) {
        setSubmissionsList(res.data.submissions);
        setShowSubmissionsModal(true);
      }
    } catch (err) {
      alert('Failed to load submissions roster');
    }
  };

  const handleSaveEvaluation = async (submissionId) => {
    const marksNum = parseInt(evalMarks, 10);
    const maxMarks = selectedAssignment ? selectedAssignment.total_marks || selectedAssignment.max_marks || 100 : 100;

    if (isNaN(marksNum) || marksNum < 0 || marksNum > maxMarks) {
      return alert(`Marks obtained must be between 0 and ${maxMarks}.`);
    }

    try {
      const res = await api.put(`/assignments/submissions/${submissionId}`, {
        marks_obtained: marksNum,
        feedback: evalFeedback,
        status: 'REVIEWED'
      });

      if (res.success) {
        setEvaluatingSub(null);
        handleViewSubmissions(selectedAssignment);
      }
    } catch (err) {
      alert(typeof err === 'string' ? err : 'Evaluation failed');
    }
  };

  const handleToggleCompletion = async (assignmentId) => {
    try {
      const res = await api.patch(`/assignments/${assignmentId}/toggle-completion`);
      if (res.success) {
        fetchInitialData();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to toggle completion');
    }
  };

  const handleMarkStatus = async (assignmentId, studentId, currentStatus) => {
    try {
      const targetStatus = currentStatus === 'SUBMITTED' || currentStatus === 'LATE' || currentStatus === 'REVIEWED' ? 'PENDING' : 'SUBMITTED';
      const res = await api.post(`/assignments/${assignmentId}/mark-status`, {
        student_id: studentId,
        status: targetStatus
      });
      if (res.success) {
        // Refresh submissions modal
        const freshRes = await api.get(`/assignments/${assignmentId}/submissions`);
        if (freshRes.success) {
          setSubmissionsList(freshRes.data.submissions);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to mark status');
    }
  };

  // Calculate Stat Metrics
  const totalCount = assignments.length;
  const publishedCount = assignments.filter(a => a.status === 'PUBLISHED').length;
  const pendingStudentSubmissions = assignments.filter(a => !a.my_submission).length;
  const totalSubmissions = assignments.reduce((acc, a) => acc + (a.submission_count || 0), 0);

  const columns = [
    { header: 'Assignment Task', accessor: 'title', render: (r) => (
        <div className="d-flex align-items-start gap-2.5">
          <div className="rounded-circle bg-primary bg-opacity-10 text-primary p-2 flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
            <i className="bi bi-file-earmark-code fs-5"></i>
          </div>
          <div>
            <span className="fw-bold text-dark d-block mb-0.5">{r.title}</span>
            <span className="small text-muted" style={{ fontSize: '0.8rem' }}>{r.description || r.instructions || 'No detailed instructions.'}</span>
            {r.file_url && (
              <div className="mt-1">
                <a href={r.file_url} target="_blank" rel="noreferrer" className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 text-decoration-none small">
                  <i className="bi bi-file-earmark-pdf me-1"></i> Reference PDF Document
                </a>
              </div>
            )}
          </div>
        </div>
      )
    },
    { header: 'Batch', accessor: 'batch_code', render: (r) => <span className="badge bg-secondary bg-opacity-10 text-dark border font-monospace px-2.5 py-1">{r.batch_code}</span> },
    { header: 'Due Date', accessor: 'due_date', render: (r) => <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 font-monospace px-2.5 py-1"><i className="bi bi-clock me-1"></i>{r.due_date ? r.due_date.replace('T', ' ').slice(0, 16) : r.deadline ? r.deadline.replace('T', ' ').slice(0, 16) : 'TBD'}</span> },
    { header: 'Total Marks', accessor: 'total_marks', render: (r) => <span className="fw-bold text-dark">{r.total_marks || r.max_marks || 100} pts</span> },
    { header: 'Submission Status', accessor: 'submission_count', render: (r) => (
        role === 'STUDENT' ? (
          r.my_submission ? (
            <span className={`badge ${['REVIEWED', 'GRADED'].includes(r.my_submission.status) ? 'bg-success bg-opacity-10 text-success border border-success' : 'bg-info bg-opacity-10 text-info border border-info'} px-3 py-1.5 rounded-pill`}>
              <i className="bi bi-check-circle me-1"></i>
              {['REVIEWED', 'GRADED'].includes(r.my_submission.status) ? `Graded: ${r.my_submission.marks_obtained}/${r.total_marks || r.max_marks || 100}` : `Submitted (${r.my_submission.status})`}
            </span>
          ) : (
            <span className="badge bg-warning bg-opacity-10 text-warning border border-warning px-2.5 py-1 rounded-pill">Pending Submission</span>
          )
        ) : (
          <span className="badge bg-primary bg-opacity-10 text-primary border border-primary px-2.5 py-1 rounded-pill">{r.submission_count || 0} Submissions</span>
        )
      )
    },
    { header: 'Actions', accessor: 'id', render: (r) => (
        role === 'STUDENT' ? (
          <div className="d-flex flex-column gap-1.5">
            <button
              className={`btn btn-sm rounded-pill px-3 fw-bold shadow-sm ${r.my_submission ? 'btn-outline-danger' : 'btn-warning text-dark'}`}
              onClick={() => handleToggleCompletion(r.id)}
            >
              {r.my_submission ? '✕ Mark Incomplete' : '✓ Mark Complete'}
            </button>
            {!r.my_submission && (
              <button className="btn btn-sm btn-primary rounded-pill px-3 fw-semibold shadow-sm" onClick={() => { setSelectedAssignment(r); setShowSubmitModal(true); }}>
                <i className="bi bi-upload me-1"></i> Submit Work
              </button>
            )}
            {r.my_submission && (
              <div className="small text-muted mt-1">
                {r.my_submission.feedback && <span className="d-block text-success fw-semibold">Feedback: {r.my_submission.feedback}</span>}
                {r.my_submission.file_url && (
                  <a href={r.my_submission.file_url} target="_blank" rel="noreferrer" className="small text-danger text-decoration-none d-block">
                    <i className="bi bi-file-earmark-pdf me-1"></i> Submitted PDF
                  </a>
                )}
              </div>
            )}
          </div>
        ) : (
          <button className="btn btn-sm btn-outline-primary rounded-pill px-3 fw-semibold shadow-sm" onClick={() => handleViewSubmissions(r)}>
            <i className="bi bi-eye-fill me-1"></i> Review Submissions ({r.submission_count || 0})
          </button>
        )
      )
    }
  ];

  return (
    <div className="cf-page-enter">
      {/* Top Banner Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h3 className="fw-extrabold text-dark mb-1">Assignments & Coursework</h3>
          <p className="text-muted mb-0">Publish practical tasks, monitor student uploads (PDF / URL), and evaluate deliverables.</p>
        </div>

        {isTrainerOrAdmin && (
          <button className="btn btn-primary rounded-pill px-4 shadow fw-bold flex-shrink-0" onClick={() => setShowCreateModal(true)}>
            <i className="bi bi-plus-lg me-1.5"></i> Create Assignment
          </button>
        )}
      </div>

      {/* Top Stat Metrics Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <DashboardCard title="Total Tasks" value={totalCount} icon="bi-journal-code" color="primary" subtitle="Assignments in system" />
        </div>
        <div className="col-md-3">
          <DashboardCard title="Published" value={publishedCount} icon="bi-check-circle" color="success" subtitle="Active for students" />
        </div>
        <div className="col-md-3">
          <DashboardCard title={role === 'STUDENT' ? "Pending Submissions" : "Total Submissions"} value={role === 'STUDENT' ? pendingStudentSubmissions : totalSubmissions} icon="bi-upload" color="warning" subtitle={role === 'STUDENT' ? "Tasks to submit" : "Uploaded by students"} />
        </div>
        <div className="col-md-3">
          <DashboardCard title="Evaluation Rate" value={totalCount > 0 ? `${Math.round((totalSubmissions / (totalCount * 10 || 1)) * 100)}%` : '100%'} icon="bi-award" color="info" subtitle="Average completion" />
        </div>
      </div>

      {/* Sleek Horizontal Filter Toolbar */}
      <div className="cf-card mb-4 p-3">
        <form onSubmit={handleSearchSubmit} className="d-flex flex-wrap align-items-center gap-2">
          <div className="flex-grow-1" style={{ minWidth: '240px' }}>
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted"><i className="bi bi-search"></i></span>
              <input
                type="text"
                className="form-control border-start-0 ps-0"
                placeholder="Search assignment title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div style={{ minWidth: '180px' }}>
            <select className="form-select" value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}>
              <option value="">All Batches</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.batch_code} ({b.name})</option>)}
            </select>
          </div>

          <div style={{ minWidth: '150px' }}>
            <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <button type="submit" className="btn btn-dark rounded-pill px-4 fw-semibold">Filter</button>

          {(searchTerm || batchFilter || statusFilter) && (
            <button
              type="button"
              className="btn btn-outline-secondary rounded-pill px-3"
              onClick={() => { setSearchTerm(''); setBatchFilter(''); setStatusFilter(''); }}
              title="Reset Filters"
            >
              <i className="bi bi-x-lg me-1"></i> Reset
            </button>
          )}
        </form>
      </div>

      {/* Assignments Data Table */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : (
        <DataTable columns={columns} data={assignments} searchKey="title" title="Coursework & Assignments Portal" />
      )}

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold"><i className="bi bi-journal-plus text-primary me-2"></i>Publish New Assignment</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)}></button>
              </div>
              <form onSubmit={handleCreateAssignment}>
                <div className="modal-body">
                  <div className="row g-3 mb-3">
                    <div className="col-md-8">
                      <label className="form-label small fw-semibold text-muted">Assignment Title *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. React Hooks & Redux State Management Project"
                        value={createData.title}
                        onChange={e => setCreateData({ ...createData, title: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">Target Batch *</label>
                      <select
                        className="form-select"
                        value={createData.batch_id}
                        onChange={e => setCreateData({ ...createData, batch_id: e.target.value })}
                        required
                      >
                        <option value="">-- Choose Batch --</option>
                        {batches.map(b => <option key={b.id} value={b.id}>{b.batch_code} ({b.name})</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Submission Due Date *</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={createData.due_date}
                        onChange={e => setCreateData({ ...createData, due_date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Total Marks *</label>
                      <input
                        type="number"
                        min="1"
                        className="form-control"
                        value={createData.total_marks}
                        onChange={e => setCreateData({ ...createData, total_marks: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Assignment Reference PDF / Document Link (Optional)</label>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="https://example.com/docs/assignment_problem_statement.pdf"
                      value={createData.file_url}
                      onChange={e => setCreateData({ ...createData, file_url: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Problem Overview & Requirements</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Describe functional objectives and evaluation criteria..."
                      value={createData.description}
                      onChange={e => setCreateData({ ...createData, description: e.target.value })}
                    ></textarea>
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-semibold text-muted">Submission Guidelines & Instructions</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="e.g. Upload PDF document or GitHub repository URL..."
                      value={createData.instructions}
                      onChange={e => setCreateData({ ...createData, instructions: e.target.value })}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-light rounded-pill" onClick={() => setShowCreateModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4 fw-semibold">Publish Assignment</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Student Submit Modal */}
      {showSubmitModal && selectedAssignment && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold"><i className="bi bi-upload text-primary me-2"></i>Submit Assignment: {selectedAssignment.title}</h5>
                <button type="button" className="btn-close" onClick={() => setShowSubmitModal(false)}></button>
              </div>
              <form onSubmit={handleSubmitAssignment}>
                <div className="modal-body">
                  <div className="p-3 bg-light rounded-3 border mb-3">
                    <div className="small text-muted">Due Date: <strong>{selectedAssignment.due_date ? selectedAssignment.due_date.replace('T', ' ') : 'TBD'}</strong></div>
                    <div className="small text-muted">Total Marks: <strong>{selectedAssignment.total_marks || selectedAssignment.max_marks || 100} pts</strong></div>
                  </div>

                  {/* PDF Document Upload Link */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">
                      <i className="bi bi-file-earmark-pdf text-danger me-1"></i> Solution PDF Document Link (Optional)
                    </label>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="https://drive.google.com/file/... or PDF document link"
                      value={submitData.file_url}
                      onChange={e => setSubmitData({ ...submitData, file_url: e.target.value })}
                    />
                    <div className="form-text small">Attach a PDF link of your solved assignment document or report.</div>
                  </div>

                  {/* Project URL / GitHub Link */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">
                      <i className="bi bi-link-45deg text-primary me-1"></i> Project Repository / Live URL (Optional)
                    </label>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="https://github.com/username/project-repo"
                      value={submitData.submission_url}
                      onChange={e => setSubmitData({ ...submitData, submission_url: e.target.value })}
                    />
                  </div>

                  {/* Text Notes */}
                  <div className="mb-2">
                    <label className="form-label small fw-semibold text-muted">Submission Notes / Written Answer (Optional)</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Provide implementation details, summary, or text answers..."
                      value={submitData.submission_text}
                      onChange={e => setSubmitData({ ...submitData, submission_text: e.target.value })}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-light rounded-pill" onClick={() => setShowSubmitModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-success rounded-pill px-4 fw-semibold">Submit Assignment Solution</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Trainer Submissions Review Modal */}
      {showSubmissionsModal && selectedAssignment && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-xl">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom">
                <div>
                  <h5 className="modal-title fw-bold">Student Submissions Roster</h5>
                  <span className="small text-muted">{selectedAssignment.title} ({selectedAssignment.batch_code})</span>
                </div>
                <button type="button" className="btn-close" onClick={() => setShowSubmissionsModal(false)}></button>
              </div>

              <div className="modal-body p-4">
                {submissionsList.length === 0 ? (
                  <div className="text-center py-5 text-muted">No student submissions submitted yet.</div>
                ) : (
                  <div className="table-responsive border rounded-3 overflow-hidden">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Student Name</th>
                          <th>Submission Deliverables</th>
                          <th>Submission Date</th>
                          <th>Status</th>
                          <th>Marks ({selectedAssignment.total_marks || 100})</th>
                          <th>Action / Feedback</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submissionsList.map(sub => (
                          <tr key={sub.id}>
                            <td>
                              <div className="fw-bold text-dark">{sub.student_name}</div>
                              <div className="small text-muted font-monospace">{sub.roll_number}</div>
                            </td>
                            <td style={{ maxWidth: '280px' }}>
                              {sub.file_url && (
                                <a href={sub.file_url} target="_blank" rel="noreferrer" className="d-block text-danger small text-truncate fw-semibold mb-1">
                                  <i className="bi bi-file-earmark-pdf me-1"></i>PDF Document Solution
                                </a>
                              )}
                              {sub.submission_url && (
                                <a href={sub.submission_url} target="_blank" rel="noreferrer" className="d-block text-primary small text-truncate fw-semibold mb-1">
                                  <i className="bi bi-link-45deg me-1"></i>{sub.submission_url}
                                </a>
                              )}
                      <span className="small text-muted text-truncate d-block" style={{ maxWidth: '250px' }}>
                                {sub.submission_text || 'No text note.'}
                              </span>
                            </td>
                            <td className="small font-monospace">{sub.submission_date ? sub.submission_date.replace('T', ' ').slice(0, 16) : ''}</td>
                            <td>
                              {sub.status ? (
                                <span className={`badge ${sub.status === 'LATE' ? 'bg-warning bg-opacity-10 text-warning border border-warning' : sub.status === 'REVIEWED' ? 'bg-success bg-opacity-10 text-success border border-success' : 'bg-primary bg-opacity-10 text-primary border border-primary'} px-2.5 py-1 rounded-pill`}>
                                  {sub.status}
                                </span>
                              ) : (
                                <span className="badge bg-secondary bg-opacity-10 text-secondary border px-2.5 py-1 rounded-pill">
                                  Not Submitted
                                </span>
                              )}
                            </td>
                            <td>
                              <span className="fw-bold text-dark">{sub.marks_obtained !== null ? `${sub.marks_obtained} / ${selectedAssignment.total_marks || 100}` : 'Ungraded'}</span>
                            </td>
                            <td>
                              <div className="d-flex flex-column gap-1.5 align-items-start">
                                <button
                                  className={`btn btn-sm rounded-pill px-2.5 py-0.5 fw-bold ${sub.status ? 'btn-outline-danger' : 'btn-outline-success'}`}
                                  onClick={() => handleMarkStatus(selectedAssignment.id, sub.student_id, sub.status)}
                                  style={{ fontSize: '0.75rem' }}
                                >
                                  {sub.status ? '✕ Mark Unsubmitted' : '✓ Mark Submitted'}
                                </button>
                                
                                {sub.status && (
                                  evaluatingSub === sub.id ? (
                                    <div className="p-2 bg-light rounded-3 border mt-1">
                                      <div className="row g-2 mb-2">
                                        <div className="col-5">
                                          <input
                                            type="number"
                                            min="0"
                                            max={selectedAssignment.total_marks || 100}
                                            className="form-control form-control-sm"
                                            placeholder="Marks"
                                            value={evalMarks}
                                            onChange={e => setEvalMarks(e.target.value)}
                                          />
                                        </div>
                                        <div className="col-7 d-flex gap-1">
                                          <button type="button" className="btn btn-sm btn-success w-100" onClick={() => handleSaveEvaluation(sub.id)}>Save</button>
                                          <button type="button" className="btn btn-sm btn-light" onClick={() => setEvaluatingSub(null)}>X</button>
                                        </div>
                                      </div>
                                      <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        placeholder="Evaluation feedback note..."
                                        value={evalFeedback}
                                        onChange={e => setEvalFeedback(e.target.value)}
                                      />
                                    </div>
                                  ) : (
                                    <button
                                      className="btn btn-sm btn-outline-secondary rounded-pill px-3 mt-1"
                                      onClick={() => {
                                        setEvaluatingSub(sub.id);
                                        setEvalMarks(sub.marks_obtained !== null ? sub.marks_obtained : '');
                                        setEvalFeedback(sub.feedback || '');
                                      }}
                                    >
                                      <i className="bi bi-pencil me-1"></i> {sub.marks_obtained !== null ? 'Re-Grade' : 'Grade'}
                                    </button>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="modal-footer border-top">
                <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowSubmissionsModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assignments;
