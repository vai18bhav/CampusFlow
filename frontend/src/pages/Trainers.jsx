import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import { useAuth } from '../context/AuthContext';

const Trainers = () => {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { role } = useAuth();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: 'password123',
    employee_id: '',
    specialization: '',
    qualification: '',
    experience_years: 0
  });

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    try {
      const res = await api.get('/users/trainers');
      if (res.success) {
        setTrainers(res.data.trainers);
      }
    } catch (err) {
      console.error('Failed to load trainers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrainer = async (e) => {
    e.preventDefault();
    try {
      // Role ID 4 = TRAINER
      const res = await api.post('/users', {
        role_id: 4,
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password || 'password123',
        role_data: {
          employee_id: formData.employee_id || `EMP-TRN-${Date.now().toString().slice(-4)}`,
          specialization: formData.specialization,
          qualification: formData.qualification,
          experience_years: parseInt(formData.experience_years || 0, 10)
        }
      });

      if (res.success) {
        setShowModal(false);
        setFormData({ full_name: '', email: '', phone: '', password: 'password123', employee_id: '', specialization: '', qualification: '', experience_years: 0 });
        fetchTrainers();
      }
    } catch (err) {
      alert(typeof err === 'string' ? err : 'Trainer creation failed');
    }
  };

  const columns = [
    { header: 'Employee ID', accessor: 'employee_id', render: (r) => <span className="badge bg-secondary bg-opacity-10 text-dark border font-monospace fw-bold">{r.employee_id}</span> },
    { header: 'Trainer Name', accessor: 'full_name', render: (r) => <span className="fw-bold text-dark">{r.full_name}</span> },
    { header: 'Email & Phone', accessor: 'email', render: (r) => <div><div className="font-monospace small">{r.email}</div><small className="text-muted">{r.phone}</small></div> },
    { header: 'Specialization', accessor: 'specialization', render: (r) => <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2.5 py-1">{r.specialization || 'Software Engineering'}</span> },
    { header: 'Experience', accessor: 'experience_years', render: (r) => `${r.experience_years || 0} years` },
    { header: 'Assigned Batches', accessor: 'assigned_batches', render: (r) => (
        r.assigned_batches && r.assigned_batches.length > 0 ? (
          r.assigned_batches.map(b => (
            <span key={b.id} className="badge bg-info bg-opacity-10 text-info border me-1">{b.batch_code}</span>
          ))
        ) : <span className="text-muted small">None assigned</span>
      )
    },
    { header: 'Status', accessor: 'status', render: (r) => <span className="badge bg-success bg-opacity-10 text-success border px-2.5 py-1 rounded-pill">{r.status}</span> }
  ];

  return (
    <div className="cf-page-enter">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1">Trainers Directory</h3>
          <p className="text-muted mb-0">View faculty profiles, technical specializations, and batch assignments.</p>
        </div>

        {['SUPER_ADMIN', 'ADMIN'].includes(role) && (
          <button className="btn btn-primary rounded-pill px-3.5 shadow-sm fw-semibold" onClick={() => setShowModal(true)}>
            <i className="bi bi-person-plus-fill me-1.5"></i> Add New Trainer
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : (
        <DataTable columns={columns} data={trainers} searchKey="full_name" title="Faculty & Instructors Roster" />
      )}

      {/* Add Trainer Modal */}
      {showModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold"><i className="bi bi-person-badge text-primary me-2"></i>Add Faculty Trainer</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleCreateTrainer}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Full Name</label>
                    <input type="text" className="form-control" placeholder="Dr. Alan Turing" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} required />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Email Address</label>
                      <input type="email" className="form-control" placeholder="trainer@campusflow.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Phone Number</label>
                      <input type="text" className="form-control" placeholder="+1987654321" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required />
                    </div>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Employee ID</label>
                      <input type="text" className="form-control" placeholder="EMP-TRN-005" value={formData.employee_id} onChange={e => setFormData({ ...formData, employee_id: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Experience Years</label>
                      <input type="number" className="form-control" placeholder="5" value={formData.experience_years} onChange={e => setFormData({ ...formData, experience_years: e.target.value })} />
                    </div>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Specialization</label>
                      <input type="text" className="form-control" placeholder="MERN, Python, ML..." value={formData.specialization} onChange={e => setFormData({ ...formData, specialization: e.target.value })} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Qualification</label>
                      <input type="text" className="form-control" placeholder="M.Tech, Ph.D, B.E." value={formData.qualification} onChange={e => setFormData({ ...formData, qualification: e.target.value })} />
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-semibold text-muted">Account Password</label>
                    <input type="text" className="form-control" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-light rounded-pill" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4 fw-semibold">Save Trainer Profile</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Trainers;
