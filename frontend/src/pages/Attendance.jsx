import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Attendance = () => {
  const { role, user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [studentHistory, setStudentHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (role === 'STUDENT') {
      fetchStudentHistory();
    } else {
      fetchBatches();
    }
  }, [role]);

  const fetchBatches = async () => {
    try {
      const res = await api.get('/batches');
      if (res.success && res.data.batches.length > 0) {
        setBatches(res.data.batches);
        setSelectedBatch(res.data.batches[0].id);
        fetchBatchAttendance(res.data.batches[0].id, selectedDate);
      }
    } catch (err) {
      console.error('Failed to load batches');
    }
  };

  const fetchBatchAttendance = async (batchId, dateVal) => {
    setLoading(true);
    try {
      const res = await api.get(`/attendance/batch?batch_id=${batchId}&date=${dateVal}`);
      if (res.success) {
        setAttendanceRecords(res.data.attendance);
      }
    } catch (err) {
      console.error('Failed to fetch batch attendance');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/attendance/student/${user.student_id || ''}`);
      if (res.success) {
        setStudentHistory(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch attendance history');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = (studentId, newStatus) => {
    setAttendanceRecords(prev =>
      prev.map(r => (r.student_id === studentId ? { ...r, status: newStatus } : r))
    );
  };

  const handleMarkAllPresent = () => {
    setAttendanceRecords(prev => prev.map(r => ({ ...r, status: 'PRESENT' })));
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      const payload = {
        batch_id: selectedBatch,
        date: selectedDate,
        attendance_records: attendanceRecords.map(r => ({
          student_id: r.student_id,
          status: r.status,
          remarks: r.remarks
        }))
      };

      const res = await api.post('/attendance/mark', payload);
      if (res.success) {
        alert('Attendance marked successfully!');
      }
    } catch (err) {
      alert(typeof err === 'string' ? err : 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  if (role === 'STUDENT') {
    const summary = studentHistory?.summary || {};
    return (
      <div>
        <div className="mb-4">
          <h3 className="fw-bold text-dark mb-1">My Attendance Tracker</h3>
          <p className="text-muted mb-0">View daily class attendance history and cumulative participation rates.</p>
        </div>

        {loading ? (
          <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
        ) : (
          <>
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <div className="cf-card text-center p-3">
                  <h6 className="text-muted text-uppercase fw-bold small mb-2">Overall Percentage</h6>
                  <h1 className="fw-extrabold text-success mb-0">{summary.attendance_percentage || 100}%</h1>
                </div>
              </div>
              <div className="col-md-3">
                <div className="cf-card text-center p-3">
                  <h6 className="text-muted text-uppercase fw-bold small mb-2">Present Days</h6>
                  <h1 className="fw-extrabold text-primary mb-0">{summary.present_days || 0}</h1>
                </div>
              </div>
              <div className="col-md-3">
                <div className="cf-card text-center p-3">
                  <h6 className="text-muted text-uppercase fw-bold small mb-2">Absent Days</h6>
                  <h1 className="fw-extrabold text-danger mb-0">{summary.absent_days || 0}</h1>
                </div>
              </div>
              <div className="col-md-3">
                <div className="cf-card text-center p-3">
                  <h6 className="text-muted text-uppercase fw-bold small mb-2">Total Classes</h6>
                  <h1 className="fw-extrabold text-dark mb-0">{summary.total_days || 0}</h1>
                </div>
              </div>
            </div>

            <div className="cf-card p-0 overflow-hidden">
              <div className="p-3 border-bottom"><h5 className="fw-bold mb-0">Date-wise Log</h5></div>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Batch Name</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentHistory?.history?.length === 0 ? (
                      <tr><td colSpan="4" className="text-center py-4 text-muted">No attendance logs recorded yet</td></tr>
                    ) : (
                      studentHistory?.history?.map((row, idx) => (
                        <tr key={idx}>
                          <td className="py-3 px-3 fw-bold">{row.date ? row.date.split('T')[0] : ''}</td>
                          <td className="py-3 px-3">{row.batch_name} ({row.batch_code})</td>
                          <td className="py-3 px-3">
                            <span className={`badge ${row.status === 'PRESENT' ? 'bg-success bg-opacity-10 text-success border border-success' : row.status === 'ABSENT' ? 'bg-danger bg-opacity-10 text-danger border border-danger' : 'bg-warning bg-opacity-10 text-warning border border-warning'} px-3 py-1 rounded-pill`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-muted">{row.remarks || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1">Attendance Register</h3>
          <p className="text-muted mb-0">Select a batch and date to record or update daily student presence.</p>
        </div>

        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary rounded-pill px-3 fw-semibold" onClick={handleMarkAllPresent} disabled={attendanceRecords.length === 0}>
            <i className="bi bi-check-all me-1"></i> Mark All Present
          </button>
          <button className="btn btn-success rounded-pill px-4 shadow-sm fw-semibold" onClick={handleSaveAttendance} disabled={saving || attendanceRecords.length === 0}>
            {saving ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-save-fill me-1"></i>}
            Save Attendance
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="cf-card mb-4 p-3">
        <div className="row g-3 align-items-center">
          <div className="col-md-6">
            <label className="form-label small fw-semibold text-muted">Select Batch *</label>
            <select
              className="form-select"
              value={selectedBatch}
              onChange={e => {
                setSelectedBatch(e.target.value);
                fetchBatchAttendance(e.target.value, selectedDate);
              }}
            >
              {batches.map(b => <option key={b.id} value={b.id}>{b.batch_code} - {b.name}</option>)}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label small fw-semibold text-muted">Attendance Date *</label>
            <input
              type="date"
              className="form-control"
              value={selectedDate}
              onChange={e => {
                setSelectedDate(e.target.value);
                fetchBatchAttendance(selectedBatch, e.target.value);
              }}
            />
          </div>
        </div>
      </div>

      {/* Roster Table */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : (
        <div className="cf-card p-0 overflow-hidden">
          <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
            <h5 className="fw-bold mb-0">Student Attendance Roster ({attendanceRecords.length} Enrolled)</h5>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light text-muted small text-uppercase">
                <tr>
                  <th className="py-3 px-3">Roll Number</th>
                  <th className="py-3 px-3">Student Name</th>
                  <th className="py-3 px-3 text-center">Status Marker</th>
                  <th className="py-3 px-3">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.length === 0 ? (
                  <tr><td colSpan="4" className="text-center py-5 text-muted">No students enrolled in this batch</td></tr>
                ) : (
                  attendanceRecords.map(s => (
                    <tr key={s.student_id}>
                      <td className="py-3 px-3"><span className="badge bg-secondary bg-opacity-10 text-dark border font-monospace px-2.5 py-1">{s.roll_number}</span></td>
                      <td className="py-3 px-3 fw-bold text-dark">{s.student_name || s.full_name}</td>
                      <td className="py-3 px-3 text-center">
                        <div className="btn-group btn-group-sm">
                          <button
                            type="button"
                            className={`btn ${s.status === 'PRESENT' ? 'btn-success fw-bold' : 'btn-outline-secondary'}`}
                            onClick={() => handleStatusToggle(s.student_id, 'PRESENT')}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            className={`btn ${s.status === 'ABSENT' ? 'btn-danger fw-bold' : 'btn-outline-secondary'}`}
                            onClick={() => handleStatusToggle(s.student_id, 'ABSENT')}
                          >
                            Absent
                          </button>
                          <button
                            type="button"
                            className={`btn ${s.status === 'LATE' ? 'btn-warning fw-bold' : 'btn-outline-secondary'}`}
                            onClick={() => handleStatusToggle(s.student_id, 'LATE')}
                          >
                            Late
                          </button>
                          <button
                            type="button"
                            className={`btn ${s.status === 'LEAVE' ? 'btn-info fw-bold' : 'btn-outline-secondary'}`}
                            onClick={() => handleStatusToggle(s.student_id, 'LEAVE')}
                          >
                            Leave
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Optional note..."
                          value={s.remarks || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setAttendanceRecords(prev => prev.map(item => item.student_id === s.student_id ? { ...item, remarks: val } : item));
                          }}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
