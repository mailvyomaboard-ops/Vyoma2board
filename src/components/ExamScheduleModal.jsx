import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function ExamScheduleModal({ roomId, onClose }) {
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(45);
  const [openAt, setOpenAt] = useState('');
  const [closeAt, setCloseAt] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const roomRef = doc(db, 'rooms', roomId);
        const snap = await getDoc(roomRef);
        const exam = snap.exists() ? snap.data().exam : null;
        if (exam) {
          setTitle(exam.title || '');
          setDuration(exam.durationMinutes || 45);
          setOpenAt(exam.openAt ? new Date(exam.openAt).toISOString().slice(0, 16) : '');
          setCloseAt(exam.closeAt ? new Date(exam.closeAt).toISOString().slice(0, 16) : '');
          setEnabled(!!exam.enabled);
        }
      } catch (e) {
        console.error('Failed to load exam config', e);
      }
    };
    load();
  }, [roomId]);

  const save = async () => {
    setSaving(true);
    const exam = {
      title: title.trim() || `Exam: ${roomId}`,
      durationMinutes: Math.max(0, Number(duration) || 0),
      openAt: openAt ? new Date(openAt).toISOString() : null,
      closeAt: closeAt ? new Date(closeAt).toISOString() : null,
      enabled,
      updatedAt: new Date().toISOString()
    };
    try {
      const roomRef = doc(db, 'rooms', roomId);
      await setDoc(roomRef, { exam }, { merge: true });
      alert('Exam scheduled! Students can now take it at /exam/' + roomId);
      onClose();
    } catch (e) {
      alert('Failed to save exam: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99998 }}>
      <div className="neo-window" onClick={e => e.stopPropagation()} style={{ width: '520px' }}>
        <div className="neo-window-header" style={{ background: 'var(--accent-pink)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: '900', textTransform: 'uppercase' }}>Schedule Exam</span>
          <button onClick={onClose} style={{ background: 'var(--surface-color)', border: '2px solid #000', cursor: 'pointer', padding: '2px' }}><X size={16} /></button>
        </div>
        <div className="neo-window-content" style={{ padding: '16px', background: 'var(--surface-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarClock size={20} />
            <span style={{ fontSize: '14px', fontWeight: '800' }}>Configure the exam session for this board. Students take it at <strong>/exam/{roomId}</strong></span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: '800' }}>Exam Title</label>
            <input type="text" className="neo-input" value={title} onChange={e => setTitle(e.target.value)} placeholder={`Exam: ${roomId}`} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: '800' }}>Duration (minutes, 0 = no timer)</label>
            <input type="number" className="neo-input" min="0" value={duration} onChange={e => setDuration(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
              <label style={{ fontSize: '13px', fontWeight: '800' }}>Opens At (optional)</label>
              <input type="datetime-local" className="neo-input" value={openAt} onChange={e => setOpenAt(e.target.value)} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
              <label style={{ fontSize: '13px', fontWeight: '800' }}>Closes At (optional)</label>
              <input type="datetime-local" className="neo-input" value={closeAt} onChange={e => setCloseAt(e.target.value)} />
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}>
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--accent-pink)' }} />
            Enable exam mode for students
          </label>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button className="neo-btn" onClick={onClose} style={{ background: 'var(--surface-color)' }}>Cancel</button>
            <button className="neo-btn" onClick={save} disabled={saving} style={{ background: 'var(--accent-green)' }}>
              {saving ? 'Saving...' : 'Save Exam Config'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
