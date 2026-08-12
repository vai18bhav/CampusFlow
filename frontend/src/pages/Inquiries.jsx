import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import { useAuth } from '../context/AuthContext';

const Inquiries = () => {
  const { role } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState(null);

  const [queryText, setQueryText] = useState('');
  const [responseText, setResponseText] = useState('');

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    try {
      const res = await api.get('/leads/inquiries');
      if (res.success) {
        setInquiries(res.data.inquiries);
      }
    } catch (err) {
      console.error('Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInquiry = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/leads/inquiries', { query: queryText });
      if (res.success) {
        setShowModal(false);
        setQueryText('');
        fetchInquiries();
      }
    } catch (err) {
      alert(typeof err === 'string' ? err : 'Inquiry submission failed');
    }
  };

  const handleRespondInquiry = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/leads/inquiries/${selectedInquiry.id}`, {
        response: responseText,
        status: 'RESOLVED'
      });
      if (res.success) {
        setShowResponseModal(false);
        setResponseText('');
        fetchInquiries();
      }
    } catch (err) {
      alert(typeof err === 'string' ? err : 'Failed to save response');
    }
  };

  const columns = [
    { header: 'Inquiry Date', accessor: 'inquiry_date', render: (r) => <span className="small font-monospace">{r.inquiry_date?.split('T')[0]}</span> },
    { header: 'Candidate / Student', accessor: 'lead_name', render: (r) => <span className="fw-bold text-dark">{r.student_name || r.lead_name || 'General Inquiry'}</span> },
    { header: 'Query Details', accessor: 'query', render: (r) => <span className="text-truncate d-inline-block" style={{ maxWidth: '280px' }}>{r.query}</span> },
    { header: 'Resolution Response', accessor: 'response', render: (r) => r.response ? <span className="text-success small fw-semibold">{r.response}</span> : <span className="text-muted small">Pending Response</span> },
    { header: 'Status', accessor: 'status', render: (r) => <span className={`cf-badge cf-badge-${r.status.toLowerCase()}`}>{r.status}</span> },
    { header: 'Action', accessor: 'id', render: (r) => (
        ['SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE', 'SUPPORT_EXECUTIVE'].includes(role) && r.status === 'PENDING' ? (
          <button className="btn btn-sm btn-outline-primary rounded-pill" onClick={() => { setSelectedInquiry(r); setShowResponseModal(true); }}>
            <i className="bi bi-reply-fill me-1"></i> Respond
          </button>
        ) : (
          <span className="text-muted small">Resolved</span>
        )
      )
    }
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1">Student & Candidate Inquiries</h3>
          <p className="text-muted mb-0">Helpdesk inquiry log, query resolution, and student support tickets.</p>
        </div>

        <button className="btn btn-primary rounded-pill px-3 shadow-sm" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-circle-fill me-1"></i> New Inquiry
        </button>
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : (
        <DataTable columns={columns} data={inquiries} searchKey="query" title="Inquiry Desk Log" />
      )}

      {/* New Inquiry Modal */}
      {showModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">Submit New Inquiry</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleCreateInquiry}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Inquiry / Question Details</label>
                    <textarea className="form-control" rows="4" placeholder="Enter inquiry text..." value={queryText} onChange={e => setQueryText(e.target.value)} required></textarea>
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-light rounded-pill" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4">Submit Inquiry</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Response Modal */}
      {showResponseModal && selectedInquiry && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">Respond to Inquiry</h5>
                <button type="button" className="btn-close" onClick={() => setShowResponseModal(false)}></button>
              </div>
              <form onSubmit={handleRespondInquiry}>
                <div className="modal-body">
                  <div className="p-3 bg-light rounded-3 mb-3 border">
                    <span className="small text-muted text-uppercase fw-bold">Original Query:</span>
                    <div className="fw-semibold text-dark mt-1">{selectedInquiry.query}</div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Resolution Answer / Response</label>
                    <textarea className="form-control" rows="4" placeholder="Provide clear resolution..." value={responseText} onChange={e => setResponseText(e.target.value)} required></textarea>
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-light rounded-pill" onClick={() => setShowResponseModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-success rounded-pill px-4">Save & Resolve</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inquiries;
