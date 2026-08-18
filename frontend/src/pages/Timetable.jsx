import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const DAY_LABELS = { MONDAY: 'Monday', TUESDAY: 'Tuesday', WEDNESDAY: 'Wednesday', THURSDAY: 'Thursday', FRIDAY: 'Friday', SATURDAY: 'Saturday', SUNDAY: 'Sunday' };
const DAY_COLORS = { 
  MONDAY: '#f97316', 
  TUESDAY: '#8b5cf6', 
  WEDNESDAY: '#10b981', 
  THURSDAY: '#f59e0b', 
  FRIDAY: '#06b6d4', 
  SATURDAY: '#3b82f6', 
  SUNDAY: '#ec4899' 
};

export default function Timetable() {
  const { role, user } = useAuth();
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(role);
  const isTrainer = role === 'TRAINER';
  const isStudent = role === 'STUDENT';
  const canEdit = isAdmin || isTrainer;

  const [batches, setBatches] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [batchInfo, setBatchInfo] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Slot Form Modal
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [editSlot, setEditSlot] = useState(null);
  const [slotForm, setSlotForm] = useState({
    day_of_week: 'MONDAY',
    subject: '',
    start_time: '09:00',
    end_time: '10:30',
    trainer_id: '',
    room_number: '',
    notes: ''
  });

  // Batch Timing Modal (for quick overall batch schedule update)
  const [showTimingModal, setShowTimingModal] = useState(false);
  const [timingForm, setTimingForm] = useState({
    start_time: '',
    end_time: '',
    timing: '',
    room_number: ''
  });
  const [updatingTiming, setUpdatingTiming] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load initial batch lists and trainers
  useEffect(() => {
    fetchBatchesAndTrainers();
  }, []);

  const fetchBatchesAndTrainers = async () => {
    try {
      const [bRes, tRes] = await Promise.all([
        api.get('/batches'),
        api.get('/users?role=TRAINER')
      ]);
      const batchList = bRes.data?.batches || [];
      setBatches(batchList);
      setTrainers(tRes.data?.users || []);

      // If no batch selected yet, fetch timetable directly (backend auto-selects for student/trainer)
      fetchTimetable('');
    } catch (err) {
      console.error('Failed to load batches:', err);
      fetchTimetable('');
    }
  };

  const fetchTimetable = async (batchId) => {
    setLoading(true);
    try {
      const url = batchId ? `/timetable?batch_id=${batchId}` : '/timetable';
      const res = await api.get(url);
      if (res.success) {
        setSlots(res.data?.slots || []);
        setBatchInfo(res.data?.batch || null);
        if (res.data?.selected_batch_id) {
          setSelectedBatch(String(res.data.selected_batch_id));
        }
      }
    } catch (err) {
      setSlots([]);
      setBatchInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchChange = (e) => {
    const bId = e.target.value;
    setSelectedBatch(bId);
    if (bId) fetchTimetable(bId);
    else {
      setSlots([]);
      setBatchInfo(null);
    }
  };

  // Slot Management
  const openAddSlot = () => {
    setEditSlot(null);
    setSlotForm({
      day_of_week: 'MONDAY',
      subject: '',
      start_time: '09:00',
      end_time: '10:30',
      trainer_id: trainers[0]?.id || '',
      room_number: batchInfo?.room_number || 'Lab 1',
      notes: ''
    });
    setShowSlotModal(true);
  };

  const openEditSlot = (slot) => {
    setEditSlot(slot);
    setSlotForm({
      day_of_week: slot.day_of_week,
      subject: slot.subject,
      start_time: slot.start_time ? slot.start_time.slice(0, 5) : '09:00',
      end_time: slot.end_time ? slot.end_time.slice(0, 5) : '10:30',
      trainer_id: slot.trainer_id || '',
      room_number: slot.room_number || '',
      notes: slot.notes || ''
    });
    setShowSlotModal(true);
  };

  const handleSlotSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...slotForm, batch_id: selectedBatch };
      if (editSlot) {
        await api.put(`/timetable/${editSlot.id}`, payload);
        showToast('✅ Slot updated & students notified via Email & In-App alert!');
      } else {
        await api.post('/timetable', payload);
        showToast('✅ Slot added & students notified via Email & In-App alert!');
      }
      setShowSlotModal(false);
      fetchTimetable(selectedBatch);
    } catch (err) {
      showToast(typeof err === 'string' ? err : 'Operation failed', 'error');
    }
  };

  const handleDeleteSlot = async (id) => {
    if (!window.confirm('Are you sure you want to remove this session? Enrolled students will be notified.')) return;
    try {
      await api.delete(`/timetable/${id}`);
      setSlots(slots.filter(s => s.id !== id));
      showToast('🗑️ Session removed & cancellation alert sent to students.');
    } catch (err) {
      showToast(typeof err === 'string' ? err : 'Failed to delete slot', 'error');
    }
  };

  // Quick Batch Timing Update
  const openTimingModal = () => {
    if (!batchInfo) return;
    setTimingForm({
      start_time: batchInfo.start_time ? batchInfo.start_time.slice(0, 5) : '09:00',
      end_time: batchInfo.end_time ? batchInfo.end_time.slice(0, 5) : '11:00',
      timing: batchInfo.timing || '09:00 AM - 11:00 AM',
      room_number: batchInfo.room_number || ''
    });
    setShowTimingModal(true);
  };

  const handleTimingSubmit = async (e) => {
    e.preventDefault();
    setUpdatingTiming(true);
    try {
      const payload = {
        name: batchInfo.name,
        course_id: batchInfo.course_id,
        trainer_id: batchInfo.trainer_id,
        start_date: batchInfo.start_date ? batchInfo.start_date.split('T')[0] : new Date().toISOString().split('T')[0],
        end_date: batchInfo.end_date ? batchInfo.end_date.split('T')[0] : null,
        start_time: timingForm.start_time,
        end_time: timingForm.end_time,
        timing: timingForm.timing || `${timingForm.start_time} - ${timingForm.end_time}`,
        room_number: timingForm.room_number,
        mode: batchInfo.mode || 'OFFLINE',
        max_students: batchInfo.max_students || 30,
        status: batchInfo.status || 'ONGOING'
      };

      await api.put(`/batches/${selectedBatch}`, payload);
      showToast('🎉 Batch timing updated! All enrolled students notified via Email & Notification!');
      setShowTimingModal(false);
      fetchTimetable(selectedBatch);
    } catch (err) {
      showToast(typeof err === 'string' ? err : 'Failed to update timing', 'error');
    } finally {
      setUpdatingTiming(false);
    }
  };

  const slotsByDay = DAYS.reduce((acc, day) => {
    acc[day] = slots.filter(s => s.day_of_week === day);
    return acc;
  }, {});

  const inp = {
    width: '100%',
    padding: '0.7rem 1rem',
    borderRadius: '10px',
    border: '1.5px solid var(--cf-input-border, #cbd5e1)',
    background: 'var(--cf-input-bg, #f8fafc)',
    color: 'var(--cf-text-main, #0f172a)',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box'
  };

  return (
    <div className="cf-page-enter" style={{ padding: '0.5rem 0' }}>
      {toast && (
        <div style={{
          position: 'fixed',
          top: '1.5rem',
          right: '1.5rem',
          padding: '0.9rem 1.4rem',
          borderRadius: '12px',
          background: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: '#fff',
          fontWeight: 700,
          zIndex: 9999,
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header Banner */}
      <div className="cf-hero-welcome d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div className="cf-hero-welcome-shapes">
          <div className="cf-shape-dot cf-shape-dot-1"></div>
          <div className="cf-shape-dot cf-shape-dot-2"></div>
        </div>

        <div className="position-relative z-1">
          <div className="d-flex align-items-center gap-2 mb-2">
            <span className="badge bg-warning bg-opacity-20 text-warning border border-warning border-opacity-30 px-3 py-1 rounded-pill">
              🗓️ ACADEMIC SCHEDULE
            </span>
          </div>
          <h3 className="fw-extrabold text-white mb-1">
            {isStudent ? 'My Class Timetable & Schedule' : 'Batch Timetable & Schedule Manager'}
          </h3>
          <p className="text-white-50 mb-0" style={{ maxWidth: '620px' }}>
            {isStudent
              ? 'View your live weekly lectures, practical lab sessions, timing, and trainer assignments.'
              : 'Manage weekly lecture slots, modify timings, and auto-dispatch schedule alerts to all enrolled students.'}
          </p>
        </div>

        <div className="d-flex gap-2 flex-wrap position-relative z-1">
          {canEdit && selectedBatch && (
            <>
              <button className="btn btn-warning rounded-pill fw-bold px-3 d-flex align-items-center gap-1.5 shadow-sm text-dark" onClick={openTimingModal}>
                <i className="bi bi-clock-history"></i> Change Batch Timing
              </button>
              <button className="btn btn-primary rounded-pill fw-bold px-3.5 d-flex align-items-center gap-1.5 shadow-sm" onClick={openAddSlot}>
                <i className="bi bi-plus-circle"></i> Add Class Slot
              </button>
            </>
          )}
        </div>
      </div>

      {/* Batch Selector Bar */}
      <div className="cf-card mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div className="d-flex align-items-center gap-2.5 flex-grow-1">
            <span className="fw-bold small text-uppercase text-muted" style={{ letterSpacing: '0.5px' }}>
              <i className="bi bi-layers me-1 text-primary"></i> Active Batch:
            </span>
            <select
              value={selectedBatch}
              onChange={handleBatchChange}
              className="form-select fw-semibold"
              style={{ maxWidth: '380px' }}
            >
              <option value="">— Select Batch —</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.batch_code}) {b.timing ? `— ${b.timing}` : ''}
                </option>
              ))}
            </select>
          </div>

          {batchInfo && (
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <span className="badge bg-primary bg-opacity-15 text-primary border border-primary border-opacity-25 px-3 py-1.5 rounded-pill">
                📚 {batchInfo.course_name}
              </span>
              <span className="badge bg-success bg-opacity-15 text-success border border-success border-opacity-25 px-3 py-1.5 rounded-pill">
                ⏰ {batchInfo.timing || `${batchInfo.start_time || '09:00'} - ${batchInfo.end_time || '11:00'}`}
              </span>
              {batchInfo.room_number && (
                <span className="badge bg-info bg-opacity-15 text-info border border-info border-opacity-25 px-3 py-1.5 rounded-pill">
                  📍 {batchInfo.room_number}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Timetable Display */}
      {loading ? (
        <div className="cf-card text-center py-5">
          <div className="spinner-border text-primary mb-3" role="status"></div>
          <div className="text-muted fw-semibold">Loading class schedule...</div>
        </div>
      ) : !selectedBatch ? (
        <div className="cf-card text-center py-5">
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📅</div>
          <h4 className="fw-bold mb-2">No Batch Selected</h4>
          <p className="text-muted mb-0">Please select a batch from the dropdown above to view or manage its weekly timetable.</p>
        </div>
      ) : (
        <div className="row g-3">
          {DAYS.map(day => {
            const daySlots = slotsByDay[day] || [];
            const color = DAY_COLORS[day];
            return (
              <div key={day} className="col-12 col-md-6 col-xl-4">
                <div className="cf-card p-0 h-100 overflow-hidden shadow-sm d-flex flex-column">
                  {/* Day Header */}
                  <div style={{
                    padding: '0.85rem 1.25rem',
                    background: `linear-gradient(135deg, ${color}, ${color}dd)`,
                    color: '#fff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div className="fw-extrabold d-flex align-items-center gap-2">
                      <i className="bi bi-calendar-event"></i>
                      <span>{DAY_LABELS[day]}</span>
                    </div>
                    <span className="badge bg-white bg-opacity-25 text-white rounded-pill px-2.5 py-1 small fw-bold">
                      {daySlots.length} {daySlots.length === 1 ? 'Class' : 'Classes'}
                    </span>
                  </div>

                  {/* Day Slot List */}
                  <div className="p-3 flex-grow-1 d-flex flex-column gap-2.5">
                    {daySlots.length === 0 ? (
                      <div className="text-center py-4 my-auto text-muted small opacity-75">
                        <i className="bi bi-cup-hot fs-4 d-block mb-1.5"></i>
                        No lectures scheduled
                      </div>
                    ) : (
                      daySlots.map(slot => (
                        <div
                          key={slot.id}
                          style={{
                            padding: '0.9rem',
                            borderRadius: '12px',
                            background: 'var(--cf-input-bg, rgba(249,115,22,0.06))',
                            border: `1.5px solid ${color}30`,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div className="d-flex justify-content-between align-items-start mb-1.5">
                            <span className="fw-extrabold" style={{ color: 'var(--cf-text-main)', fontSize: '0.95rem' }}>
                              {slot.subject}
                            </span>
                            <span className="badge rounded-pill fw-bold" style={{ background: `${color}25`, color: color, fontSize: '0.75rem' }}>
                              <i className="bi bi-clock me-1"></i>
                              {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
                            </span>
                          </div>

                          <div className="d-flex flex-wrap gap-2 text-muted small mt-2" style={{ fontSize: '0.8rem' }}>
                            {slot.trainer_name && (
                              <span className="d-flex align-items-center gap-1">
                                <i className="bi bi-person-badge text-primary"></i> {slot.trainer_name}
                              </span>
                            )}
                            {slot.room_number && (
                              <span className="d-flex align-items-center gap-1">
                                <i className="bi bi-geo-alt text-danger"></i> {slot.room_number}
                              </span>
                            )}
                          </div>

                          {slot.notes && (
                            <div className="text-muted small mt-1.5 pt-1.5 border-top" style={{ fontSize: '0.78rem', borderColor: 'var(--cf-border)' }}>
                              <i className="bi bi-info-circle me-1"></i> {slot.notes}
                            </div>
                          )}

                          {canEdit && (
                            <div className="d-flex justify-content-end gap-1.5 mt-2.5 pt-2 border-top" style={{ borderColor: 'var(--cf-border)' }}>
                              <button
                                className="btn btn-sm btn-outline-primary py-0.5 px-2.5 rounded-pill"
                                style={{ fontSize: '0.75rem' }}
                                onClick={() => openEditSlot(slot)}
                              >
                                <i className="bi bi-pencil me-1"></i> Edit
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger py-0.5 px-2.5 rounded-pill"
                                style={{ fontSize: '0.75rem' }}
                                onClick={() => handleDeleteSlot(slot.id)}
                              >
                                <i className="bi bi-trash me-1"></i> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL 1: ADD / EDIT CLASS SLOT ── */}
      {showSlotModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '1rem' }}>
          <div className="cf-card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <h5 className="fw-bold mb-0">
                {editSlot ? '✏️ Edit Lecture Slot' : '➕ Add New Class Slot'}
              </h5>
              <button className="btn-close" onClick={() => setShowSlotModal(false)}></button>
            </div>

            <div className="alert alert-info py-2 px-3 small rounded-3 mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-bell-fill text-info fs-5"></i>
              <span>All enrolled students in this batch will receive instant Email & In-App notifications.</span>
            </div>

            <form onSubmit={handleSlotSubmit} className="d-flex flex-column gap-3">
              <div>
                <label className="form-label small fw-bold text-muted">Day of the Week *</label>
                <select
                  value={slotForm.day_of_week}
                  onChange={e => setSlotForm({ ...slotForm, day_of_week: e.target.value })}
                  className="form-select"
                  required
                >
                  {DAYS.map(d => (
                    <option key={d} value={d}>{DAY_LABELS[d]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label small fw-bold text-muted">Subject / Module Topic *</label>
                <input
                  type="text"
                  placeholder="e.g. Docker Containerization & Microservices"
                  value={slotForm.subject}
                  onChange={e => setSlotForm({ ...slotForm, subject: e.target.value })}
                  style={inp}
                  required
                />
              </div>

              <div className="row g-2">
                <div className="col-6">
                  <label className="form-label small fw-bold text-muted">Start Time *</label>
                  <input
                    type="time"
                    value={slotForm.start_time}
                    onChange={e => setSlotForm({ ...slotForm, start_time: e.target.value })}
                    style={inp}
                    required
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-bold text-muted">End Time *</label>
                  <input
                    type="time"
                    value={slotForm.end_time}
                    onChange={e => setSlotForm({ ...slotForm, end_time: e.target.value })}
                    style={inp}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label small fw-bold text-muted">Assigned Trainer</label>
                <select
                  value={slotForm.trainer_id}
                  onChange={e => setSlotForm({ ...slotForm, trainer_id: e.target.value })}
                  className="form-select"
                >
                  <option value="">— Use Default Batch Trainer —</option>
                  {trainers.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name} ({t.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label small fw-bold text-muted">Room Number / Meeting Link</label>
                <input
                  type="text"
                  placeholder="e.g. Lab 2 / Zoom / Google Meet Link"
                  value={slotForm.room_number}
                  onChange={e => setSlotForm({ ...slotForm, room_number: e.target.value })}
                  style={inp}
                />
              </div>

              <div>
                <label className="form-label small fw-bold text-muted">Session Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Bring laptops with Docker Desktop installed"
                  value={slotForm.notes}
                  onChange={e => setSlotForm({ ...slotForm, notes: e.target.value })}
                  style={inp}
                />
              </div>

              <div className="d-flex gap-2 justify-content-end mt-2 pt-2 border-top">
                <button type="button" className="btn btn-outline-secondary px-3" onClick={() => setShowSlotModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary px-4 fw-bold">
                  {editSlot ? 'Save Changes' : 'Create & Notify Students'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: CHANGE BATCH OVERALL TIMING ── */}
      {showTimingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '1rem' }}>
          <div className="cf-card" style={{ width: '100%', maxWidth: '460px' }}>
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <h5 className="fw-bold mb-0">⏰ Update Batch Timing</h5>
              <button className="btn-close" onClick={() => setShowTimingModal(false)}></button>
            </div>

            <div className="alert alert-warning py-2 px-3 small rounded-3 mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-broadcast text-warning fs-5"></i>
              <span>All enrolled students in <strong>{batchInfo?.name}</strong> will receive an instant schedule update email!</span>
            </div>

            <form onSubmit={handleTimingSubmit} className="d-flex flex-column gap-3">
              <div className="row g-2">
                <div className="col-6">
                  <label className="form-label small fw-bold text-muted">Daily Start Time</label>
                  <input
                    type="time"
                    value={timingForm.start_time}
                    onChange={e => setTimingForm({ ...timingForm, start_time: e.target.value })}
                    style={inp}
                    required
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-bold text-muted">Daily End Time</label>
                  <input
                    type="time"
                    value={timingForm.end_time}
                    onChange={e => setTimingForm({ ...timingForm, end_time: e.target.value })}
                    style={inp}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label small fw-bold text-muted">Schedule Display String</label>
                <input
                  type="text"
                  placeholder="e.g. Mon-Fri 09:00 AM - 11:00 AM"
                  value={timingForm.timing}
                  onChange={e => setTimingForm({ ...timingForm, timing: e.target.value })}
                  style={inp}
                />
              </div>

              <div>
                <label className="form-label small fw-bold text-muted">Classroom / Meeting Room</label>
                <input
                  type="text"
                  placeholder="e.g. Lab 4 (Floor 2) or Online"
                  value={timingForm.room_number}
                  onChange={e => setTimingForm({ ...timingForm, room_number: e.target.value })}
                  style={inp}
                />
              </div>

              <div className="d-flex gap-2 justify-content-end mt-2 pt-2 border-top">
                <button type="button" className="btn btn-outline-secondary px-3" onClick={() => setShowTimingModal(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={updatingTiming} className="btn btn-warning px-4 fw-bold text-dark">
                  {updatingTiming ? 'Updating...' : 'Update & Notify Students 🔔'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
