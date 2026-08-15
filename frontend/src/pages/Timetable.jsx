import React, { useState, useEffect } from 'react';
import api from '../services/api';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const DAY_LABELS = { MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun' };
const DAY_COLORS = { MONDAY: '#3b82f6', TUESDAY: '#8b5cf6', WEDNESDAY: '#10b981', THURSDAY: '#f59e0b', FRIDAY: '#ef4444', SATURDAY: '#06b6d4', SUNDAY: '#ec4899' };

export default function Timetable() {
  const [batches, setBatches] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editSlot, setEditSlot] = useState(null);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ day_of_week: 'MONDAY', subject: '', start_time: '09:00', end_time: '10:00', trainer_id: '', room_number: '', notes: '' });

  const user = JSON.parse(localStorage.getItem('cf_user') || '{}');
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.role);
  const isTrainer = user.role === 'TRAINER';
  const canEdit = isAdmin || isTrainer;

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    api.get('/batches').then(r => setBatches(r.data?.batches || [])).catch(() => {});
    api.get('/users?role=TRAINER').then(r => setTrainers(r.data?.users || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedBatch) { setSlots([]); return; }
    setLoading(true);
    api.get(`/timetable?batch_id=${selectedBatch}`)
      .then(r => setSlots(r.data?.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [selectedBatch]);

  const openAdd = () => { setEditSlot(null); setForm({ day_of_week: 'MONDAY', subject: '', start_time: '09:00', end_time: '10:00', trainer_id: '', room_number: '', notes: '' }); setShowForm(true); };
  const openEdit = (slot) => { setEditSlot(slot); setForm({ day_of_week: slot.day_of_week, subject: slot.subject, start_time: slot.start_time?.slice(0,5), end_time: slot.end_time?.slice(0,5), trainer_id: slot.trainer_id || '', room_number: slot.room_number || '', notes: slot.notes || '' }); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, batch_id: selectedBatch };
      if (editSlot) { await api.put(`/timetable/${editSlot.id}`, payload); showToast('Slot updated!'); }
      else { await api.post('/timetable', payload); showToast('Slot added!'); }
      setShowForm(false);
      const r = await api.get(`/timetable?batch_id=${selectedBatch}`);
      setSlots(r.data?.slots || []);
    } catch (err) { showToast(err || 'Error', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this slot?')) return;
    await api.delete(`/timetable/${id}`);
    setSlots(slots.filter(s => s.id !== id));
    showToast('Slot deleted');
  };

  const slotsByDay = DAYS.reduce((acc, day) => { acc[day] = slots.filter(s => s.day_of_week === day); return acc; }, {});

  return (
    <div style={{ padding: '1.5rem' }}>
      {toast && (
        <div style={{ position: 'fixed', top: '1rem', right: '1rem', padding: '0.85rem 1.4rem', borderRadius: '10px', background: toast.type === 'error' ? '#ef4444' : '#10b981', color: '#fff', fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            🗓️ Batch Timetable
          </h2>
          <p style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Weekly schedule for training batches</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}
            style={{ padding: '0.6rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: '0.9rem', minWidth: '220px' }}>
            <option value=''>— Select a Batch —</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.batch_code})</option>)}
          </select>
          {canEdit && selectedBatch && (
            <button onClick={openAdd}
              style={{ padding: '0.6rem 1.4rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
              + Add Slot
            </button>
          )}
        </div>
      </div>

      {!selectedBatch ? (
        <div style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📅</div>
          <h3 style={{ color: 'var(--text-primary)' }}>Select a Batch to View Schedule</h3>
          <p>Choose a batch from the dropdown above to see or manage its timetable.</p>
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading timetable...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {DAYS.map(day => (
            <div key={day} style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
              <div style={{ padding: '0.75rem 1rem', background: DAY_COLORS[day], color: '#fff', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{DAY_LABELS[day]}</span>
                <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>{slotsByDay[day].length} class{slotsByDay[day].length !== 1 ? 'es' : ''}</span>
              </div>
              <div style={{ padding: '0.75rem', minHeight: '80px' }}>
                {slotsByDay[day].length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', padding: '1.2rem 0' }}>No classes scheduled</div>
                ) : slotsByDay[day].map(slot => (
                  <div key={slot.id} style={{ padding: '0.7rem', borderRadius: '10px', background: `${DAY_COLORS[day]}18`, border: `1px solid ${DAY_COLORS[day]}40`, marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{slot.subject}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      🕐 {slot.start_time?.slice(0,5)} – {slot.end_time?.slice(0,5)}
                    </div>
                    {slot.trainer_name && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>👤 {slot.trainer_name}</div>}
                    {slot.room_number && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>🚪 Room {slot.room_number}</div>}
                    {canEdit && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => openEdit(slot)} style={{ fontSize: '0.75rem', padding: '0.25rem 0.7rem', borderRadius: '6px', border: 'none', background: '#3b82f620', color: '#3b82f6', cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                        <button onClick={() => handleDelete(slot.id)} style={{ fontSize: '0.75rem', padding: '0.25rem 0.7rem', borderRadius: '6px', border: 'none', background: '#ef444420', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            <h3 style={{ margin: '0 0 1.5rem', fontWeight: 800 }}>{editSlot ? 'Edit' : 'Add'} Timetable Slot</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { label: 'Day', key: 'day_of_week', type: 'select', options: DAYS.map(d => ({ value: d, label: d })) },
                { label: 'Subject / Topic', key: 'subject', type: 'text', placeholder: 'e.g. React.js Fundamentals' },
                { label: 'Start Time', key: 'start_time', type: 'time' },
                { label: 'End Time', key: 'end_time', type: 'time' },
                { label: 'Trainer', key: 'trainer_id', type: 'select', options: [{ value: '', label: '— None —' }, ...trainers.map(t => ({ value: t.id, label: t.full_name }))] },
                { label: 'Room Number', key: 'room_number', type: 'text', placeholder: 'e.g. Lab 3' },
                { label: 'Notes', key: 'notes', type: 'text', placeholder: 'Optional notes' }
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>{f.label}</label>
                  {f.type === 'select' ? (
                    <select value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
                      {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input type={f.type} value={form[f.key]} placeholder={f.placeholder} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type='button' onClick={() => setShowForm(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button type='submit' style={{ flex: 2, padding: '0.75rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>{editSlot ? 'Update' : 'Add'} Slot</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
