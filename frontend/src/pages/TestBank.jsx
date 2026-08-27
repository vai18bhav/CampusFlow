import React, { useState, useEffect } from 'react';
import api from '../services/api';

const TestBank = () => {
  const [templates, setTemplates] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReuseModal, setShowReuseModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const [form, setForm] = useState({
    title: '',
    description: '',
    attachment_url: '',
    is_mandatory: true
  });

  const [reuseForm, setReuseForm] = useState({
    batch_ids: [],
    due_date: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resT, resB] = await Promise.all([
        api.get('/assignments/templates'),
        api.get('/batches')
      ]);

      if (resT.success) setTemplates(resT.data?.templates || []);
      if (resB.success) setBatches(resB.data?.batches || []);
    } catch (err) {
      setMsg({ text: 'Failed to fetch test bank data', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title) {
      setMsg({ text: 'Title is required.', type: 'danger' });
      return;
    }

    setSubmitting(true); setMsg({ text: '', type: '' });
    try {
      const res = await api.post('/assignments/templates', form);
      if (res.success) {
        setMsg({ text: 'Test template created in Test Bank!', type: 'success' });
        setShowCreateModal(false);
        setForm({ title: '', description: '', attachment_url: '', is_mandatory: true });
        fetchData();
      }
    } catch (err) {
      setMsg({ text: typeof err === 'string' ? err : 'Creation failed.', type: 'danger' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReuse = (template) => {
    setSelectedTemplate(template);
    setReuseForm({ batch_ids: [], due_date: '' });
    setShowReuseModal(true);
  };

  const handleReuseSubmit = async (e) => {
    e.preventDefault();
    if (!reuseForm.batch_ids.length || !reuseForm.due_date) {
      setMsg({ text: 'Please select at least one batch and due date.', type: 'danger' });
      return;
    }

    setSubmitting(true); setMsg({ text: '', type: '' });
    try {
      const res = await api.post(`/assignments/templates/${selectedTemplate.id}/reuse`, reuseForm);
      if (res.success) {
        setMsg({ text: `Test template "${selectedTemplate.title}" distributed to ${reuseForm.batch_ids.length} batch(es)!`, type: 'success' });
        setShowReuseModal(false);
      }
    } catch (err) {
      setMsg({ text: typeof err === 'string' ? err : 'Distribution failed.', type: 'danger' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete template "${title}"?`)) return;
    try {
      const res = await api.delete(`/assignments/templates/${id}`);
      if (res.success) {
        fetchData();
      }
    } catch (err) {
      alert('Failed to delete template');
    }
  };

  return (
    <div className="container-fluid py-3">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">
            <i className="bi bi-bank2 text-primary me-2"></i>Predefined Test Bank
          </h4>
          <p className="text-muted small mb-0">FR-012: Manage reusable assignment and test templates for quick batch distribution</p>
        </div>
        <button className="btn btn-primary rounded-pill px-4 fw-semibold shadow-sm" onClick={() => setShowCreateModal(true)}>
          <i className="bi bi-plus-circle me-2"></i>Create Test Template
        </button>
      </div>

      {msg.text && (
        <div className={`alert alert-${msg.type} alert-dismissible fade show small rounded-3 mb-4`} role="alert">
          {msg.text}
          <button type="button" className="btn-close" onClick={() => setMsg({ text: '', type: '' })}></button>
        </div>
      )}

      {/* Templates List */}
      <div className="row g-3">
        {loading ? (
          <div className="col-12 text-center py-5 text-muted">
            <div className="spinner-border spinner-border-sm text-primary me-2"></div>
            Loading Test Bank templates...
          </div>
        ) : templates.length === 0 ? (
          <div className="col-12 text-center py-5 text-muted">
            <i className="bi bi-journal-x fs-2 d-block mb-2"></i>No test templates created in Test Bank yet.
          </div>
        ) : (
          templates.map(t => (
            <div key={t.id} className="col-md-6 col-lg-4">
              <div className="card border-0 shadow-sm rounded-4 h-100 p-3">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className={`badge ${t.is_mandatory ? 'bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25' : 'bg-secondary bg-opacity-10 text-secondary border'} px-2.5 py-1 rounded-pill`}>
                    {t.is_mandatory ? 'Mandatory Test' : 'Optional Assignment'}
                  </span>
                  <button className="btn btn-sm btn-link text-danger p-0" onClick={() => handleDelete(t.id, t.title)} title="Delete Template">
                    <i className="bi bi-trash fs-6"></i>
                  </button>
                </div>
                <h6 className="fw-bold text-dark mb-1">{t.title}</h6>
                <p className="text-muted small mb-3 flex-grow-1" style={{ minHeight: '40px' }}>
                  {t.description || 'No detailed description specified.'}
                </p>

                {t.attachment_url && (
                  <div className="mb-3">
                    <a href={t.attachment_url} target="_blank" rel="noopener noreferrer" className="small text-primary text-decoration-none">
                      <i className="bi bi-paperclip me-1"></i>View Attachment (PDF/Image)
                    </a>
                  </div>
                )}

                <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                  <span className="small text-muted">By: {t.trainer_name || 'Trainer'}</span>
                  <button className="btn btn-sm btn-outline-primary rounded-pill px-3 fw-semibold" onClick={() => handleOpenReuse(t)}>
                    <i className="bi bi-send me-1.5"></i>Reuse for Batch
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold">Create Test Template</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)}></button>
              </div>
              <form onSubmit={handleCreate}>
                <div className="modal-body py-3">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Test Title <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. React Hooks Quiz, Node.js Async Exam"
                      value={form.title}
                      onChange={e => setForm({ ...form, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Description &amp; Instructions</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Instructions, syllabus covered, duration..."
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                    ></textarea>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Attachment Link / File URL (PDF, PNG, JPG)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="https://... attachment link"
                      value={form.attachment_url}
                      onChange={e => setForm({ ...form, attachment_url: e.target.value })}
                    />
                  </div>

                  <div className="form-check form-switch mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="isMandatoryCheck"
                      checked={form.is_mandatory}
                      onChange={e => setForm({ ...form, is_mandatory: e.target.checked })}
                    />
                    <label className="form-check-input-label small fw-semibold text-dark" htmlFor="isMandatoryCheck">
                      Mandatory Completion Test
                    </label>
                  </div>
                </div>

                <div className="modal-footer border-top-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary rounded-pill" onClick={() => setShowCreateModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4" disabled={submitting}>
                    {submitting ? 'Saving...' : 'Save Template'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reuse Template Modal */}
      {showReuseModal && selectedTemplate && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold">Distribute Test: {selectedTemplate.title}</h5>
                <button type="button" className="btn-close" onClick={() => setShowReuseModal(false)}></button>
              </div>
              <form onSubmit={handleReuseSubmit}>
                <div className="modal-body py-3">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Select Target Batch(es) <span className="text-danger">*</span></label>
                    <div className="p-2 border rounded-3 bg-light" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                      {batches.map(b => (
                        <div key={b.id} className="form-check mb-1">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            value={b.id}
                            id={`batch_${b.id}`}
                            checked={reuseForm.batch_ids.includes(b.id)}
                            onChange={e => {
                              const checked = e.target.checked;
                              setReuseForm(prev => ({
                                ...prev,
                                batch_ids: checked ? [...prev.batch_ids, b.id] : prev.batch_ids.filter(id => id !== b.id)
                              }));
                            }}
                          />
                          <label className="form-check-label small text-dark" htmlFor={`batch_${b.id}`}>
                            <strong>{b.name}</strong> ({b.batch_code})
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Submission Due Date <span className="text-danger">*</span></label>
                    <input
                      type="date"
                      className="form-control"
                      value={reuseForm.due_date}
                      onChange={e => setReuseForm({ ...reuseForm, due_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer border-top-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary rounded-pill" onClick={() => setShowReuseModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4" disabled={submitting}>
                    {submitting ? 'Distributing...' : 'Distribute to Batches'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestBank;
