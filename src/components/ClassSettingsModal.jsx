import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { X, Save, GraduationCap } from 'lucide-react';
import { YEARS, DOMAINS, DIVISIONS, CLASS_TYPES, isLabLike } from '../lib/classMeta';

export default function ClassSettingsModal({ roomId, onClose }) {
  const [form, setForm] = useState({
    year: '', branch: '', subject: '', courseCode: '',
    type: 'theory', division: '', batch: '', batchesText: '',
    term: '', academicYear: '', assignedTeachersText: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'rooms', roomId));
        const cm = snap.exists() ? (snap.data().classMeta || {}) : {};
        setForm({
          year: cm.year || '',
          branch: cm.branch || '',
          subject: cm.subject || '',
          courseCode: cm.courseCode || '',
          type: cm.type || 'theory',
          division: cm.division || '',
          batch: cm.batch || '',
          batchesText: Array.isArray(cm.batches) ? cm.batches.join(', ') : '',
          term: cm.term || '',
          academicYear: cm.academicYear || '',
          assignedTeachersText: Array.isArray(cm.assignedTeachers) ? cm.assignedTeachers.join(', ') : ''
        });
      } catch (e) {
        console.error('Failed to load class settings', e);
      }
    };
    load();
  }, [roomId]);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const batches = () => form.batchesText.split(',').map(s => s.trim()).filter(Boolean);

  const save = async () => {
    setError('');
    if (!form.year || !form.branch || !form.subject.trim()) {
      setError('Year, Branch and Subject are required.');
      return;
    }
    const labLike = isLabLike(form);
    if (labLike && batches().length === 0) {
      setError('Add at least one batch for a Lab / Tutorial class.');
      return;
    }
    if (!labLike && !form.division) {
      setError('Pick a Division for a Theory class.');
      return;
    }

    setSaving(true);
    const classMeta = {
      year: form.year,
      branch: form.branch,
      subject: form.subject.trim(),
      courseCode: form.courseCode.trim() || form.subject.trim(),
      type: form.type,
      term: form.term.trim(),
      academicYear: form.academicYear.trim()
    };
    if (labLike) {
      classMeta.batches = batches();
      classMeta.batch = form.batch || batches()[0] || '';
    } else {
      classMeta.division = form.division;
    }
    classMeta.assignedTeachers = form.assignedTeachersText.split(',').map(s => s.trim()).filter(Boolean);

    try {
      const roomRef = doc(db, 'rooms', roomId);
      await setDoc(roomRef, { classMeta }, { merge: true });

      if (labLike) {
        // Auto-sync a required "Batch" dropdown into the exam's student form.
        const snap = await getDoc(roomRef);
        const room = snap.exists() ? snap.data() : {};
        const authFields = Array.isArray(room.exam?.authFields) ? room.exam.authFields : [];
        const existing = authFields.find(f => f.label === 'Batch');
        const batchField = {
          id: 'batch',
          label: 'Batch',
          type: 'select',
          required: true,
          placeholder: 'Select your batch',
          options: batches()
        };
        const nextFields = existing
          ? authFields.map(f => f.id === 'batch' ? { ...f, ...batchField } : f)
          : [...authFields, batchField];
        await setDoc(roomRef, { exam: { ...(room.exam || {}), authFields: nextFields } }, { merge: true });
      }

      alert('Class settings saved.');
      onClose();
    } catch (e) {
      setError('Failed to save: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const fieldLabel = (text, color) => (
    <span className="neo-badge" style={{ background: color, fontSize: '11px', marginBottom: '6px' }}>{text}</span>
  );

  const select = (value, onChange, options, placeholder) => (
    <select className="neo-input" style={{ width: '100%', cursor: 'pointer' }} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  const labLike = isLabLike(form);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99998 }}>
      <div className="neo-window" onClick={e => e.stopPropagation()} style={{ width: '560px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="neo-window-header" style={{ background: 'var(--accent-green)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: '900', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}><GraduationCap size={16} /> Class Settings</span>
          <button onClick={onClose} style={{ background: 'var(--surface-color)', border: '2px solid #000', cursor: 'pointer', padding: '2px' }}><X size={16} /></button>
        </div>
        <div className="neo-window-content" style={{ padding: '16px', background: 'var(--surface-color)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '13px', fontWeight: '600', margin: 0 }}>
            Defines which classroom this board belongs to. Students whose profile matches see this class's exams.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              {fieldLabel('Year', 'var(--accent-blue)')}
              {select(form.year, v => set('year', v), YEARS, 'Select year')}
            </div>
            <div>
              {fieldLabel('Branch', 'var(--accent-purple)')}
              {select(form.branch, v => set('branch', v), DOMAINS, 'Select branch')}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              {fieldLabel('Subject', 'var(--accent-pink)')}
              <input type="text" className="neo-input" style={{ width: '100%' }} placeholder="e.g. Data Structures" value={form.subject} onChange={e => set('subject', e.target.value)} />
            </div>
            <div>
              {fieldLabel('Course Code', 'var(--accent-orange)')}
              <input type="text" className="neo-input" style={{ width: '100%' }} placeholder="e.g. CS301" value={form.courseCode} onChange={e => set('courseCode', e.target.value)} />
            </div>
          </div>

          <div>
            {fieldLabel('Class Type', 'var(--accent-green)')}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {CLASS_TYPES.map(t => (
                <button
                  key={t.id}
                  className="neo-btn"
                  onClick={() => set('type', t.id)}
                  style={{ background: form.type === t.id ? 'var(--accent-yellow)' : 'var(--surface-color)', padding: '6px 14px', fontSize: '13px' }}
                >{t.label}</button>
              ))}
            </div>
          </div>

          {!labLike ? (
            <div>
              {fieldLabel('Division', 'var(--accent-green)')}
              {select(form.division, v => set('division', v), DIVISIONS, 'Select division')}
            </div>
          ) : (
            <>
              <div>
                {fieldLabel('Batches (comma separated)', 'var(--accent-blue)')}
                <input type="text" className="neo-input" style={{ width: '100%' }} placeholder="e.g. A1, A2, B1" value={form.batchesText} onChange={e => set('batchesText', e.target.value)} />
              </div>
              <div>
                {fieldLabel('This room\'s batch', 'var(--accent-pink)')}
                {select(form.batch || '', v => set('batch', v), batches(), 'Select batch')}
              </div>
            </>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              {fieldLabel('Term', 'var(--accent-blue)')}
              <input type="text" className="neo-input" style={{ width: '100%' }} placeholder="e.g. Sem I" value={form.term} onChange={e => set('term', e.target.value)} />
            </div>
            <div>
              {fieldLabel('Academic Year', 'var(--accent-blue)')}
              <input type="text" className="neo-input" style={{ width: '100%' }} placeholder="e.g. 2025-26" value={form.academicYear} onChange={e => set('academicYear', e.target.value)} />
            </div>
          </div>

          <div>
            {fieldLabel('Co-teachers (user IDs, comma separated)', 'var(--accent-purple)')}
            <input type="text" className="neo-input" style={{ width: '100%' }} placeholder="e.g. acc-123, acc-456" value={form.assignedTeachersText} onChange={e => set('assignedTeachersText', e.target.value)} />
          </div>

          {error && <span className="neo-badge" style={{ background: '#ff5f56', color: 'var(--surface-color)', display: 'block', textAlign: 'center' }}>{error}</span>}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button className="neo-btn" onClick={onClose} style={{ background: 'var(--surface-color)' }}>Cancel</button>
            <button className="neo-btn" onClick={save} disabled={saving} style={{ background: 'var(--accent-green)' }}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Class'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
