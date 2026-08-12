import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import { useAuth } from '../context/AuthContext';

const Courses = () => {
  const { role } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals State
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [selectedCourseDetails, setSelectedCourseDetails] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(role);

  // Form State
  const [formData, setFormData] = useState({
    course_name: '',
    course_code: '',
    category: 'Web Development',
    duration: '',
    fees: '',
    description: '',
    status: 'ACTIVE'
  });

  useEffect(() => {
    fetchCourses();
  }, [categoryFilter, statusFilter]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      let queryParams = [];
      if (categoryFilter) queryParams.push(`category=${encodeURIComponent(categoryFilter)}`);
      if (statusFilter) queryParams.push(`status=${encodeURIComponent(statusFilter)}`);
      if (searchTerm) queryParams.push(`search=${encodeURIComponent(searchTerm)}`);

      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      const res = await api.get(`/courses${queryString}`);
      if (res.success) {
        setCourses(res.data.courses);
      }
    } catch (err) {
      console.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCourses();
  };

  const handleOpenAddModal = () => {
    setEditingCourse(null);
    setFormError('');
    setFormData({
      course_name: '',
      course_code: '',
      category: 'Web Development',
      duration: '',
      fees: '',
      description: '',
      status: 'ACTIVE'
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (course) => {
    setEditingCourse(course);
    setFormError('');
    setFormData({
      course_name: course.name,
      course_code: course.code,
      category: course.category || 'Web Development',
      duration: course.duration_weeks,
      fees: course.fee_amount,
      description: course.description || '',
      status: course.status
    });
    setShowModal(true);
  };

  const handleOpenDetailsModal = async (courseId) => {
    try {
      const res = await api.get(`/courses/${courseId}`);
      if (res.success) {
        setSelectedCourseDetails(res.data.course);
        setShowDetailsModal(true);
      }
    } catch (err) {
      alert('Failed to load course details');
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Client-side validation
    if (!formData.course_name.trim()) return setFormError('Course Name is required.');
    if (!formData.course_code.trim()) return setFormError('Course Code is required.');
    if (!formData.category.trim()) return setFormError('Category is required.');
    
    const durationNum = parseInt(formData.duration, 10);
    if (isNaN(durationNum) || durationNum <= 0) return setFormError('Duration must be a valid positive number of weeks.');

    const feeNum = parseFloat(formData.fees);
    if (isNaN(feeNum) || feeNum < 0) return setFormError('Fees must be a valid positive number.');

    setSubmitting(true);

    try {
      const payload = {
        name: formData.course_name.trim(),
        code: formData.course_code.trim().toUpperCase(),
        category: formData.category.trim(),
        duration_weeks: durationNum,
        fee_amount: feeNum,
        description: formData.description.trim(),
        status: formData.status
      };

      let res;
      if (editingCourse) {
        res = await api.put(`/courses/${editingCourse.id}`, payload);
      } else {
        res = await api.post('/courses', payload);
      }

      if (res.success) {
        setShowModal(false);
        fetchCourses();
      }
    } catch (err) {
      setFormError(typeof err === 'string' ? err : 'Course operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (course) => {
    const nextStatus = course.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const confirmText = `Are you sure you want to ${nextStatus === 'INACTIVE' ? 'deactivate' : 'activate'} "${course.name}" (${course.code})?`;
    
    if (window.confirm(confirmText)) {
      try {
        const res = await api.patch(`/courses/${course.id}/status`, { status: nextStatus });
        if (res.success) {
          fetchCourses();
        }
      } catch (err) {
        alert(typeof err === 'string' ? err : 'Failed to update course status');
      }
    }
  };

  const columns = [
    { header: 'Course Name', accessor: 'name', render: (r) => (
        <div>
          <span className="fw-bold text-dark d-block">{r.name}</span>
          <span className="small text-muted text-truncate d-inline-block" style={{ maxWidth: '250px' }}>
            {r.description || 'No description provided.'}
          </span>
        </div>
      )
    },
    { header: 'Course Code', accessor: 'code', render: (r) => <span className="badge bg-secondary bg-opacity-10 text-dark border font-monospace px-2.5 py-1">{r.code}</span> },
    { header: 'Category', accessor: 'category', render: (r) => <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2.5 py-1 rounded-pill">{r.category || 'Web Development'}</span> },
    { header: 'Duration', accessor: 'duration_weeks', render: (r) => <span className="fw-semibold">{r.duration_weeks} Weeks</span> },
    { header: 'Tuition Fee', accessor: 'fee_amount', render: (r) => <span className="fw-bold text-success">${parseFloat(r.fee_amount).toLocaleString()}</span> },
    { header: 'Status', accessor: 'status', render: (r) => (
        <span className={`badge ${r.status === 'ACTIVE' ? 'bg-success bg-opacity-10 text-success border border-success border-opacity-25' : 'bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25'} px-3 py-1.5 rounded-pill fw-semibold`}>
          <i className={`bi ${r.status === 'ACTIVE' ? 'bi-check-circle-fill' : 'bi-pause-circle-fill'} me-1`}></i>
          {r.status}
        </span>
      )
    },
    { header: 'Actions', accessor: 'id', render: (r) => (
        <div className="d-flex align-items-center gap-1.5">
          <button className="btn btn-sm btn-outline-info rounded-circle p-1.5" title="View Course Details" onClick={() => handleOpenDetailsModal(r.id)}>
            <i className="bi bi-eye-fill"></i>
          </button>
          
          {isAdmin && (
            <>
              <button className="btn btn-sm btn-outline-primary rounded-circle p-1.5" title="Edit Course" onClick={() => handleOpenEditModal(r)}>
                <i className="bi bi-pencil-fill"></i>
              </button>

              <button
                className={`btn btn-sm ${r.status === 'ACTIVE' ? 'btn-outline-danger' : 'btn-outline-success'} rounded-circle p-1.5`}
                title={r.status === 'ACTIVE' ? 'Deactivate Course' : 'Activate Course'}
                onClick={() => handleToggleStatus(r)}
              >
                <i className={`bi ${r.status === 'ACTIVE' ? 'bi-lock-fill' : 'bi-unlock-fill'}`}></i>
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div>
      {/* Header Banner */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1">Course Management</h3>
          <p className="text-muted mb-0">Manage all training courses, curriculum parameters, categories, and fees.</p>
        </div>

        {isAdmin && (
          <button className="btn btn-primary rounded-pill px-3.5 shadow-sm fw-semibold" onClick={handleOpenAddModal}>
            <i className="bi bi-plus-circle-fill me-1"></i> Add Course
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="cf-card mb-4 p-3">
        <form onSubmit={handleSearchSubmit} className="row g-3 align-items-center">
          <div className="col-md-5">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted"><i className="bi bi-search"></i></span>
              <input
                type="text"
                className="form-control border-start-0 ps-0"
                placeholder="Search by course name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="col-md-3">
            <select className="form-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All Categories</option>
              <option value="Web Development">Web Development</option>
              <option value="Data Science">Data Science</option>
              <option value="Cloud & DevOps">Cloud & DevOps</option>
              <option value="Cyber Security">Cyber Security</option>
              <option value="Mobile Development">Mobile Development</option>
            </select>
          </div>

          <div className="col-md-2">
            <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>

          <div className="col-md-2 d-flex gap-2">
            <button type="submit" className="btn btn-dark rounded-pill w-100 fw-semibold">Filter</button>
            {(searchTerm || categoryFilter || statusFilter) && (
              <button
                type="button"
                className="btn btn-outline-secondary rounded-pill"
                onClick={() => { setSearchTerm(''); setCategoryFilter(''); setStatusFilter(''); }}
                title="Reset Filters"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Course List Table */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : (
        <DataTable columns={columns} data={courses} searchKey="name" title="Active & Configured Training Courses" />
      )}

      {/* Add / Edit Course Form Modal */}
      {showModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">{editingCourse ? 'Edit Course Information' : 'Add New Training Course'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleFormSubmit}>
                <div className="modal-body">
                  {formError && (
                    <div className="alert alert-danger py-2 px-3 small rounded-3 mb-3">
                      <i className="bi bi-exclamation-circle-fill me-1"></i> {formError}
                    </div>
                  )}

                  <div className="row g-3 mb-3">
                    <div className="col-md-8">
                      <label className="form-label small fw-semibold text-muted">Course Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Full Stack Web Development"
                        value={formData.course_name}
                        onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">Course Code *</label>
                      <input
                        type="text"
                        className="form-control font-monospace text-uppercase"
                        placeholder="e.g. FSWD-101"
                        value={formData.course_code}
                        onChange={(e) => setFormData({ ...formData, course_code: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">Category *</label>
                      <select
                        className="form-select"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        required
                      >
                        <option value="Web Development">Web Development</option>
                        <option value="Data Science">Data Science</option>
                        <option value="Cloud & DevOps">Cloud & DevOps</option>
                        <option value="Cyber Security">Cyber Security</option>
                        <option value="Mobile Development">Mobile Development</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">Duration (Weeks) *</label>
                      <input
                        type="number"
                        min="1"
                        className="form-control"
                        placeholder="16"
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">Tuition Fee ($) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control"
                        placeholder="1200.00"
                        value={formData.fees}
                        onChange={(e) => setFormData({ ...formData, fees: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Status</label>
                    <select
                      className="form-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-semibold text-muted">Course Description</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      placeholder="Enter detailed course syllabus overview and target learning outcomes..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-light rounded-pill" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4 fw-semibold" disabled={submitting}>
                    {submitting ? 'Saving...' : editingCourse ? 'Update Course' : 'Create Course'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Course Details Modal */}
      {showDetailsModal && selectedCourseDetails && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom">
                <div className="d-flex align-items-center gap-2">
                  <h5 className="modal-title fw-bold">{selectedCourseDetails.name}</h5>
                  <span className="badge bg-secondary bg-opacity-10 text-dark border font-monospace px-2.5 py-1">{selectedCourseDetails.code}</span>
                </div>
                <button type="button" className="btn-close" onClick={() => setShowDetailsModal(false)}></button>
              </div>

              <div className="modal-body p-4">
                <div className="row g-3 mb-4 text-center">
                  <div className="col-4">
                    <div className="p-3 bg-light rounded-3 border">
                      <div className="small text-muted text-uppercase fw-bold">Total Batches</div>
                      <div className="fs-4 fw-bold text-dark mt-1">{selectedCourseDetails.stats?.total_batches || 0}</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-3 bg-primary bg-opacity-10 rounded-3 border border-primary border-opacity-25">
                      <div className="small text-primary text-uppercase fw-bold">Total Students</div>
                      <div className="fs-4 fw-bold text-primary mt-1">{selectedCourseDetails.stats?.total_students || 0}</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-3 bg-success bg-opacity-10 rounded-3 border border-success border-opacity-25">
                      <div className="small text-success text-uppercase fw-bold">Assigned Trainers</div>
                      <div className="fs-4 fw-bold text-success mt-1">{selectedCourseDetails.stats?.assigned_trainers || 0}</div>
                    </div>
                  </div>
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded-3 border">
                      <div className="small text-muted">Category:</div>
                      <div className="fw-semibold text-dark">{selectedCourseDetails.category || 'Web Development'}</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded-3 border">
                      <div className="small text-muted">Duration:</div>
                      <div className="fw-semibold text-dark">{selectedCourseDetails.duration_weeks} Weeks</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded-3 border">
                      <div className="small text-muted">Tuition Fee:</div>
                      <div className="fw-bold text-success fs-5">${parseFloat(selectedCourseDetails.fee_amount).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded-3 border">
                      <div className="small text-muted">Status:</div>
                      <div>
                        <span className={`badge ${selectedCourseDetails.status === 'ACTIVE' ? 'bg-success' : 'bg-danger'} px-3 py-1 rounded-pill mt-1`}>
                          {selectedCourseDetails.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h6 className="fw-bold text-dark mb-2">Syllabus & Overview Description</h6>
                  <div className="p-3 bg-light rounded-3 border text-dark">
                    {selectedCourseDetails.description || 'No detailed syllabus description provided.'}
                  </div>
                </div>

                <div className="d-flex justify-content-between text-muted small border-top pt-3">
                  <span>Created: {new Date(selectedCourseDetails.created_at).toLocaleDateString()}</span>
                  <span>Last Updated: {new Date(selectedCourseDetails.updated_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="modal-footer border-top">
                <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowDetailsModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Courses;
