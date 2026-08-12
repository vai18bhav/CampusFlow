import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import { useAuth } from '../context/AuthContext';

const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { role } = useAuth();

  const [formData, setFormData] = useState({
    candidate_name: '',
    email: '',
    phone: '',
    course_id: '',
    lead_source: 'WEBSITE',
    notes: ''
  });

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const [resL, resC] = await Promise.all([
        api.get('/leads'),
        api.get('/courses')
      ]);

      if (resL.success) setLeads(resL.data.leads);
      if (resC.success) setCourses(resC.data.courses);
    } catch (err) {
      console.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/leads', formData);
      if (res.success) {
        setShowModal(false);
        setFormData({ candidate_name: '', email: '', phone: '', course_id: '', lead_source: 'WEBSITE', notes: '' });
        fetchLeads();
      }
    } catch (err) {
      alert(typeof err === 'string' ? err : 'Lead creation failed');
    }
  };

  const handleUpdateStatus = async (leadId, newStatus) => {
    try {
      await api.put(`/leads/${leadId}`, { status: newStatus });
      fetchLeads();
    } catch (err) {
      alert('Failed to update lead status');
    }
  };

  const columns = [
    { header: 'Candidate Name', accessor: 'candidate_name', render: (r) => <span className="fw-bold text-dark">{r.candidate_name}</span> },
    { header: 'Email & Phone', accessor: 'email', render: (r) => <div><div>{r.email}</div><small className="text-muted">{r.phone}</small></div> },
    { header: 'Target Course', accessor: 'course_name', render: (r) => r.course_name || 'General Inquiry' },
    { header: 'Source', accessor: 'lead_source', render: (r) => <span className="badge bg-light text-dark">{r.lead_source}</span> },
    { header: 'Sales Executive', accessor: 'sales_exec_name', render: (r) => r.sales_exec_name || 'Unassigned' },
    { header: 'Pipeline Status', accessor: 'status', render: (r) => (
        <select
          className={`form-select form-select-sm fw-bold border-0 cf-badge cf-badge-${r.status.toLowerCase()}`}
          value={r.status}
          onChange={(e) => handleUpdateStatus(r.id, e.target.value)}
        >
          <option value="NEW">NEW</option>
          <option value="CONTACTED">CONTACTED</option>
          <option value="IN_PROGRESS">IN PROGRESS</option>
          <option value="CONVERTED">CONVERTED</option>
          <option value="LOST">LOST</option>
        </select>
      )
    }
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1">Leads & Inquiries Pipeline</h3>
          <p className="text-muted mb-0">Track prospective candidate inquiries, follow-up status, and conversion milestones.</p>
        </div>

        {['SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'].includes(role) && (
          <button className="btn btn-primary rounded-pill px-3 shadow-sm" onClick={() => setShowModal(true)}>
            <i className="bi bi-funnel-fill me-1"></i> Add Lead
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : (
        <DataTable columns={columns} data={leads} searchKey="candidate_name" title="Lead Directory" />
      )}

      {showModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">Capture New Lead</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleCreateLead}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Candidate Name</label>
                    <input type="text" className="form-control" value={formData.candidate_name} onChange={e => setFormData({ ...formData, candidate_name: e.target.value })} required />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Email</label>
                      <input type="email" className="form-control" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Phone</label>
                      <input type="text" className="form-control" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required />
                    </div>
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Target Course</label>
                      <select className="form-select" value={formData.course_id} onChange={e => setFormData({ ...formData, course_id: e.target.value })}>
                        <option value="">-- Choose Course --</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Lead Source</label>
                      <select className="form-select" value={formData.lead_source} onChange={e => setFormData({ ...formData, lead_source: e.target.value })}>
                        <option value="WEBSITE">Website</option>
                        <option value="REFERRAL">Referral</option>
                        <option value="SOCIAL_MEDIA">Social Media</option>
                        <option value="WALK_IN">Walk-In</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Notes / Interest Details</label>
                    <textarea className="form-control" rows="2" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}></textarea>
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-light rounded-pill" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4">Save Lead</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;
