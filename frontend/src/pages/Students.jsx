import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import { useAuth } from '../context/AuthContext';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { role } = useAuth();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: 'password123',
    roll_number: '',
    qualification: '',
    guardian_name: '',
    guardian_phone: ''
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await api.get('/users/students');
      if (res.success) {
        setStudents(res.data.students);
      }
    } catch (err) {
      console.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    try {
      // Create user with STUDENT role (role_id = 6)
      const res = await api.post('/users', {
        role_id: 6,
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password || 'password123',
        role_data: {
          roll_number: formData.roll_number || `STU-2026-${Date.now().toString().slice(-4)}`,
          qualification: formData.qualification,
          guardian_name: formData.guardian_name,
          guardian_phone: formData.guardian_phone
        }
      });

      if (res.success) {
        setShowModal(false);
        setFormData({ full_name: '', email: '', phone: '', password: 'password123', roll_number: '', qualification: '', guardian_name: '', guardian_phone: '' });
        fetchStudents();
      }
    } catch (err) {
      alert(typeof err === 'string' ? err : 'Student registration failed');
    }
  };

  const handleDeleteStudent = async (userId, studentName) => {
    if (!window.confirm(`Are you sure you want to delete student "${studentName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await api.delete(`/users/${userId}`);
      if (res.success) {
        fetchStudents();
      }
    } catch (err) {
      alert(typeof err === 'string' ? err : 'Failed to delete student profile.');
    }
  };

  const columns = [
    { header: 'Roll Number', accessor: 'roll_number', render: (r) => <span className="badge bg-secondary bg-opacity-10 text-dark border font-monospace fw-bold">{r.roll_number}</span> },
    { header: 'Student Name', accessor: 'full_name', render: (r) => <span className="fw-bold text-dark">{r.full_name}</span> },
    { header: 'Email & Phone', accessor: 'email', render: (r) => <div><div className="font-monospace small">{r.email}</div><small className="text-muted">{r.phone}</small></div> },
    { header: 'Qualification', accessor: 'qualification', render: (r) => <span className="badge bg-info bg-opacity-10 text-info border px-2.5 py-1">{r.qualification || 'B.Tech / CS'}</span> },
    { header: 'Enrolled Batches', accessor: 'batches', render: (r) => (
        r.batches && r.batches.length > 0 ? (
          r.batches.map(b => (
            <span key={b.id} className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 me-1">{b.batch_code}</span>
          ))
        ) : <span className="text-muted small">Not Enrolled</span>
      )
    },
    { header: 'Status', accessor: 'status', render: (r) => <span className="badge bg-success bg-opacity-10 text-success border px-2.5 py-1 rounded-pill">{r.status}</span> },
    { header: 'Actions', accessor: 'user_id', render: (r) => (
        ['SUPER_ADMIN', 'ADMIN'].includes(role) ? (
          <button
            className="btn btn-sm btn-outline-danger rounded-pill px-3 shadow-sm fw-semibold"
            onClick={() => handleDeleteStudent(r.user_id, r.full_name)}
            title="Delete Student Profile"
          >
            <i className="bi bi-trash-fill me-1"></i> Delete
          </button>
        ) : <span className="text-muted small">N/A</span>
      )
    }
  ];

  return (
    <div className="cf-page-enter">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1">Students Directory</h3>
          <p className="text-muted mb-0">Manage enrolled student profiles, roll numbers, and batch details.</p>
        </div>

        {['SUPER_ADMIN', 'ADMIN', 'TRAINER', 'SALES_EXECUTIVE'].includes(role) && (
          <button className="btn btn-primary rounded-pill px-3.5 shadow-sm fw-semibold" onClick={() => setShowModal(true)}>
            <i className="bi bi-person-plus-fill me-1.5"></i> Register New Student
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : (
        <DataTable columns={columns} data={students} searchKey="full_name" title="Enrolled Student Roster" />
      )}

      {/* Register Student Modal */}
      {showModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold"><i className="bi bi-mortarboard text-primary me-2"></i>Register New Student</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleCreateStudent}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Full Name</label>
                    <input type="text" className="form-control" placeholder="John Doe" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} required />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Email Address</label>
                      <input type="email" className="form-control" placeholder="student@campusflow.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Phone Number</label>
                      <input type="text" className="form-control" placeholder="+1987654321" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required />
                    </div>
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Roll Number</label>
                      <input type="text" className="form-control" placeholder="STU-2026-004" value={formData.roll_number} onChange={e => setFormData({ ...formData, roll_number: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Qualification</label>
                      <input type="text" className="form-control" placeholder="B.Tech, B.Sc, BCA..." value={formData.qualification} onChange={e => setFormData({ ...formData, qualification: e.target.value })} />
                    </div>
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Guardian Name</label>
                      <input type="text" className="form-control" value={formData.guardian_name} onChange={e => setFormData({ ...formData, guardian_name: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Guardian Phone</label>
                      <input type="text" className="form-control" value={formData.guardian_phone} onChange={e => setFormData({ ...formData, guardian_phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-semibold text-muted">Account Password</label>
                    <input type="text" className="form-control" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-light rounded-pill" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4 fw-semibold">Register Student Account</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
