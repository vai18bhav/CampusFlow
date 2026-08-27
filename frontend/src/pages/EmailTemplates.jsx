import React, { useState, useEffect } from 'react';
import api from '../services/api';

const EmailTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/email-templates');
      if (res.success) {
        setTemplates(res.data.templates || []);
      }
    } catch (err) {
      console.error('Failed to load email templates', err);
      setAlertMsg({ type: 'danger', text: 'Failed to load email templates.' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (tpl) => {
    setEditingTemplate({ ...tpl });
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!editingTemplate) return;
    setSaving(true);
    try {
      const res = await api.put(`/admin/email-templates/${editingTemplate.id}`, {
        subject: editingTemplate.subject,
        body_html: editingTemplate.body_html,
        is_active: editingTemplate.is_active
      });

      if (res.success) {
        setAlertMsg({ type: 'success', text: 'Email template updated successfully!' });
        setEditingTemplate(null);
        fetchTemplates();
      }
    } catch (err) {
      setAlertMsg({ type: 'danger', text: err.response?.data?.message || 'Failed to update email template' });
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewClick = async (tpl) => {
    try {
      const res = await api.post(`/admin/email-templates/${tpl.id}/preview`);
      if (res.success) {
        setPreviewTemplate({
          name: tpl.name,
          subject: res.data.subject,
          html: res.data.html
        });
      }
    } catch (err) {
      console.error('Failed to generate preview', err);
    }
  };

  const categories = ['ALL', 'ADMISSION', 'FINANCE', 'MOCK', 'ASSIGNMENT', 'USER', 'SALES'];

  const filteredTemplates = templates.filter(t => {
    const matchesCat = selectedCategory === 'ALL' || t.category === selectedCategory;
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="cf-page-enter">
      {/* Header Banner */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-extrabold text-dark mb-1">
            <i className="bi bi-envelope-paper-fill text-primary me-2"></i>Email Template Management
          </h4>
          <p className="text-muted small mb-0">Configure automated email notification subjects, HTML templates, and dynamic variables.</p>
        </div>
      </div>

      {alertMsg.text && (
        <div className={`alert alert-${alertMsg.type} alert-dismissible fade show rounded-3 mb-4`} role="alert">
          {alertMsg.text}
          <button type="button" className="btn-close" onClick={() => setAlertMsg({ type: '', text: '' })}></button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="cf-card p-3 mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div className="d-flex flex-wrap gap-1">
            {categories.map(cat => (
              <button
                key={cat}
                className={`btn btn-sm rounded-pill font-monospace fw-bold px-3 ${selectedCategory === cat ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="position-relative" style={{ maxWidth: '300px' }}>
            <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
            <input
              type="text"
              className="form-control form-control-sm ps-5 rounded-pill"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Template Grid */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary"></div>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-inbox fs-1 d-block mb-2"></i>
          No email templates found matching the criteria.
        </div>
      ) : (
        <div className="row g-3">
          {filteredTemplates.map(tpl => (
            <div key={tpl.id} className="col-md-6 col-lg-4">
              <div className="card border-0 shadow-sm rounded-4 h-100 p-3 position-relative">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="badge bg-primary bg-opacity-10 text-primary fw-bold font-monospace px-2.5 py-1">
                    {tpl.category}
                  </span>
                  <span className={`badge rounded-pill ${tpl.is_active ? 'bg-success' : 'bg-secondary'}`}>
                    {tpl.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <h6 className="fw-bold text-dark mb-1">{tpl.name}</h6>
                <code className="text-muted small mb-2 d-block">{tpl.code}</code>

                <div className="p-2 bg-light rounded-3 small text-truncate mb-3 border">
                  <strong>Subject:</strong> {tpl.subject}
                </div>

                <div className="d-flex gap-2 mt-auto">
                  <button className="btn btn-sm btn-outline-primary rounded-pill px-3 w-50" onClick={() => handleEditClick(tpl)}>
                    <i className="bi bi-pencil me-1"></i> Edit
                  </button>
                  <button className="btn btn-sm btn-outline-info rounded-pill px-3 w-50" onClick={() => handlePreviewClick(tpl)}>
                    <i className="bi bi-eye me-1"></i> Preview
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EDIT TEMPLATE MODAL */}
      {editingTemplate && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold text-dark">
                  <i className="bi bi-pencil-square text-primary me-2"></i>Edit Template: {editingTemplate.name}
                </h5>
                <button type="button" className="btn-close" onClick={() => setEditingTemplate(null)}></button>
              </div>

              <form onSubmit={handleSaveTemplate}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold small text-muted">Template Code</label>
                    <input type="text" className="form-control font-monospace bg-light" value={editingTemplate.code} readOnly />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold text-dark">Subject Line</label>
                    <input
                      type="text"
                      className="form-control fw-semibold"
                      value={editingTemplate.subject}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold text-dark">HTML Body Content</label>
                    <textarea
                      rows="8"
                      className="form-control font-monospace small"
                      value={editingTemplate.body_html}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, body_html: e.target.value })}
                      required
                    ></textarea>
                  </div>

                  <div className="form-check form-switch mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="activeCheck"
                      checked={!!editingTemplate.is_active}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, is_active: e.target.checked ? 1 : 0 })}
                    />
                    <label className="form-check-label fw-semibold text-dark" htmlFor="activeCheck">
                      Template Active Status
                    </label>
                  </div>

                  {/* Variables Legend */}
                  <div className="p-3 bg-light rounded-3 border">
                    <span className="small text-uppercase fw-bold text-muted d-block mb-1">Supported Dynamic Variables:</span>
                    <div className="d-flex flex-wrap gap-1 font-monospace" style={{ fontSize: '11px' }}>
                      <span className="badge bg-secondary">{'{{student_name}}'}</span>
                      <span className="badge bg-secondary">{'{{student_email}}'}</span>
                      <span className="badge bg-secondary">{'{{course_name}}'}</span>
                      <span className="badge bg-secondary">{'{{batch_name}}'}</span>
                      <span className="badge bg-secondary">{'{{invoice_number}}'}</span>
                      <span className="badge bg-secondary">{'{{amount}}'}</span>
                      <span className="badge bg-secondary">{'{{currency}}'}</span>
                      <span className="badge bg-secondary">{'{{due_date}}'}</span>
                      <span className="badge bg-secondary">{'{{mock_date}}'}</span>
                      <span className="badge bg-secondary">{'{{mock_time}}'}</span>
                      <span className="badge bg-secondary">{'{{interviewer_name}}'}</span>
                      <span className="badge bg-secondary">{'{{credit_remaining}}'}</span>
                      <span className="badge bg-secondary">{'{{expiry_date}}'}</span>
                      <span className="badge bg-secondary">{'{{assignment_title}}'}</span>
                      <span className="badge bg-secondary">{'{{login_link}}'}</span>
                      <span className="badge bg-secondary">{'{{reset_link}}'}</span>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setEditingTemplate(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4 fw-bold" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Template'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW TEMPLATE MODAL */}
      {previewTemplate && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold text-dark">
                  <i className="bi bi-eye-fill text-info me-2"></i>Email Preview: {previewTemplate.name}
                </h5>
                <button type="button" className="btn-close" onClick={() => setPreviewTemplate(null)}></button>
              </div>
              <div className="modal-body">
                <div className="p-3 bg-light rounded-3 mb-3 border">
                  <strong>Subject:</strong> {previewTemplate.subject}
                </div>
                <div className="p-3 border rounded-3 bg-white" dangerouslySetInnerHTML={{ __html: previewTemplate.html }}></div>
              </div>
              <div className="modal-footer border-0">
                <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setPreviewTemplate(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTemplates;
