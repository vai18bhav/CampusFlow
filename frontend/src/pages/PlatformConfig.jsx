import React, { useState, useEffect } from 'react';
import api from '../services/api';

const PlatformConfig = () => {
  const [config, setConfig] = useState({
    app_name: 'CampusFlow',
    app_subtitle: 'Enterprise Training & Admissions Portal',
    app_logo_url: '/logo.png',
    default_currency: 'INR',
    course_categories: ['Full Stack Development', 'Data Science & AI', 'Cloud & DevOps', 'Cyber Security', 'UI/UX Design'],
    batch_categories: ['Regular Morning', 'Regular Evening', 'Weekend Fast-Track', 'Corporate Batch'],
    system_defaults: { default_page_size: 20, enable_welcome_email: true, auto_assign_batch: true },
    email_templates: {
      welcome_subject: 'Welcome to CampusFlow - Account Activated',
      admission_subject: 'CampusFlow - Admission Confirmation',
      payment_subject: 'CampusFlow - Payment Receipt'
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [activeTab, setActiveTab] = useState('branding');

  // Temporary input helpers
  const [newCourseCat, setNewCourseCat] = useState('');
  const [newBatchCat, setNewBatchCat] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await api.get('/config');
      if (res.success && res.data?.config) {
        setConfig(prev => ({
          ...prev,
          ...res.data.config
        }));
      }
    } catch (err) {
      setMsg({ text: 'Failed to load configuration settings', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg({ text: '', type: '' });
    try {
      const res = await api.put('/config', { settings: config });
      if (res.success) {
        setMsg({ text: 'Platform configuration saved successfully!', type: 'success' });
      }
    } catch (err) {
      setMsg({ text: typeof err === 'string' ? err : 'Failed to save settings', type: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const addCategory = (type, value, setter) => {
    if (!value.trim()) return;
    const key = type === 'course' ? 'course_categories' : 'batch_categories';
    const list = config[key] || [];
    if (!list.includes(value.trim())) {
      setConfig({ ...config, [key]: [...list, value.trim()] });
    }
    setter('');
  };

  const removeCategory = (type, item) => {
    const key = type === 'course' ? 'course_categories' : 'batch_categories';
    setConfig({ ...config, [key]: (config[key] || []).filter(c => c !== item) });
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">
            <i className="bi bi-gear-wide-connected text-primary me-2"></i>Platform Configuration &amp; Settings
          </h4>
          <p className="text-muted small mb-0">FR-003: Configure system categories, defaults, branding, and notification templates</p>
        </div>
        <button className="btn btn-primary rounded-pill px-4 fw-semibold shadow-sm" onClick={handleSave} disabled={saving}>
          {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <><i className="bi bi-floppy me-2"></i>Save Configuration</>}
        </button>
      </div>

      {msg.text && (
        <div className={`alert alert-${msg.type} alert-dismissible fade show small rounded-3 mb-4`} role="alert">
          {msg.text}
          <button type="button" className="btn-close" onClick={() => setMsg({ text: '', type: '' })}></button>
        </div>
      )}

      {/* Tabs */}
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-header bg-white border-bottom-0 pt-3 px-4">
          <ul className="nav nav-tabs card-header-tabs border-bottom-0">
            <li className="nav-item">
              <button className={`nav-item-btn nav-link fw-semibold ${activeTab === 'branding' ? 'active text-primary' : 'text-muted'}`} onClick={() => setActiveTab('branding')}>
                <i className="bi bi-palette me-2"></i>Branding &amp; Identity
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-item-btn nav-link fw-semibold ${activeTab === 'categories' ? 'active text-primary' : 'text-muted'}`} onClick={() => setActiveTab('categories')}>
                <i className="bi bi-tags me-2"></i>Course &amp; Batch Categories
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-item-btn nav-link fw-semibold ${activeTab === 'defaults' ? 'active text-primary' : 'text-muted'}`} onClick={() => setActiveTab('defaults')}>
                <i className="bi bi-sliders me-2"></i>System Defaults
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-item-btn nav-link fw-semibold ${activeTab === 'notifications' ? 'active text-primary' : 'text-muted'}`} onClick={() => setActiveTab('notifications')}>
                <i className="bi bi-envelope-paper me-2"></i>Email Templates
              </button>
            </li>
          </ul>
        </div>

        <div className="card-body p-4">
          <form onSubmit={handleSave}>
            {/* Tab 1: Branding */}
            {activeTab === 'branding' && (
              <div className="row g-3" style={{ maxWidth: 700 }}>
                <div className="col-12">
                  <label className="form-label small fw-semibold">Application Name</label>
                  <input type="text" className="form-control" value={config.app_name} onChange={e => setConfig({ ...config, app_name: e.target.value })} />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">Application Subtitle / Tagline</label>
                  <input type="text" className="form-control" value={config.app_subtitle} onChange={e => setConfig({ ...config, app_subtitle: e.target.value })} />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">Logo Image URL</label>
                  <input type="text" className="form-control" value={config.app_logo_url} onChange={e => setConfig({ ...config, app_logo_url: e.target.value })} />
                  <span className="form-text text-muted small">Relative path (e.g. <code>/logo.png</code>) or full HTTP image URL</span>
                </div>
              </div>
            )}

            {/* Tab 2: Categories */}
            {activeTab === 'categories' && (
              <div className="row g-4" style={{ maxWidth: 800 }}>
                <div className="col-md-6">
                  <h6 className="fw-bold text-dark mb-3">Course Categories</h6>
                  <div className="input-group mb-3">
                    <input type="text" className="form-control form-control-sm" placeholder="New category name..." value={newCourseCat} onChange={e => setNewCourseCat(e.target.value)} />
                    <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => addCategory('course', newCourseCat, setNewCourseCat)}>Add</button>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {(config.course_categories || []).map((cat, idx) => (
                      <span key={idx} className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2.5 py-1.5 rounded-pill d-inline-flex align-items-center gap-2">
                        {cat}
                        <i className="bi bi-x-circle-fill cursor-pointer" onClick={() => removeCategory('course', cat)}></i>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="col-md-6">
                  <h6 className="fw-bold text-dark mb-3">Batch Categories</h6>
                  <div className="input-group mb-3">
                    <input type="text" className="form-control form-control-sm" placeholder="New batch category..." value={newBatchCat} onChange={e => setNewBatchCat(e.target.value)} />
                    <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => addCategory('batch', newBatchCat, setNewBatchCat)}>Add</button>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {(config.batch_categories || []).map((cat, idx) => (
                      <span key={idx} className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2.5 py-1.5 rounded-pill d-inline-flex align-items-center gap-2">
                        {cat}
                        <i className="bi bi-x-circle-fill cursor-pointer" onClick={() => removeCategory('batch', cat)}></i>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: System Defaults */}
            {activeTab === 'defaults' && (
              <div className="row g-3" style={{ maxWidth: 600 }}>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Default Currency</label>
                  <select className="form-select" value={config.default_currency} onChange={e => setConfig({ ...config, default_currency: e.target.value })}>
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Default Table Page Size</label>
                  <input
                    type="number"
                    className="form-control"
                    value={config.system_defaults?.default_page_size || 20}
                    onChange={e => setConfig({ ...config, system_defaults: { ...config.system_defaults, default_page_size: parseInt(e.target.value, 10) } })}
                  />
                </div>
                <div className="col-12 mt-3">
                  <div className="form-check form-switch mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="enableWelcomeEmail"
                      checked={config.system_defaults?.enable_welcome_email ?? true}
                      onChange={e => setConfig({ ...config, system_defaults: { ...config.system_defaults, enable_welcome_email: e.target.checked } })}
                    />
                    <label className="form-check-input-label small fw-semibold" htmlFor="enableWelcomeEmail">Enable Automated Welcome Emails</label>
                  </div>
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="autoAssignBatch"
                      checked={config.system_defaults?.auto_assign_batch ?? true}
                      onChange={e => setConfig({ ...config, system_defaults: { ...config.system_defaults, auto_assign_batch: e.target.checked } })}
                    />
                    <label className="form-check-input-label small fw-semibold" htmlFor="autoAssignBatch">Auto-Suggest Batches during Admission Approval</label>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Notifications */}
            {activeTab === 'notifications' && (
              <div className="row g-3" style={{ maxWidth: 700 }}>
                <div className="col-12">
                  <label className="form-label small fw-semibold">Student Welcome Email Subject</label>
                  <input
                    type="text"
                    className="form-control"
                    value={config.email_templates?.welcome_subject || ''}
                    onChange={e => setConfig({ ...config, email_templates: { ...config.email_templates, welcome_subject: e.target.value } })}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">Admission Confirmation Email Subject</label>
                  <input
                    type="text"
                    className="form-control"
                    value={config.email_templates?.admission_subject || ''}
                    onChange={e => setConfig({ ...config, email_templates: { ...config.email_templates, admission_subject: e.target.value } })}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">Payment Receipt Email Subject</label>
                  <input
                    type="text"
                    className="form-control"
                    value={config.email_templates?.payment_subject || ''}
                    onChange={e => setConfig({ ...config, email_templates: { ...config.email_templates, payment_subject: e.target.value } })}
                  />
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default PlatformConfig;
