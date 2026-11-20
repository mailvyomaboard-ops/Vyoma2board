import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { X, Save, User, ChevronDown } from 'lucide-react';
import { DESIGNATIONS, DOMAINS, YEARS, DIVISIONS, loadProfile, saveProfile, saveCustomFieldsMeta } from '../lib/examProfile';

export default function ProfileSetupModal({ onClose, onSaved, authFields = [], roomId = '' }) {
  const current = loadProfile();
  const [form, setForm] = useState({
    designation: current.designation,
    domain: current.domain,
    year: current.year,
    division: current.division,
    rollNo: current.rollNo,
    prn: current.prn
  });
  const [custom, setCustom] = useState(() => {
    try { return JSON.parse(localStorage.getItem('examFields_' + roomId) || '{}'); }
    catch (e) { return {}; }
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const setCustomVal = (id, value) => setCustom(prev => ({ ...prev, [id]: value }));

  const requiredCustomMissing = authFields.filter(f => f.required).some(f => !(custom[f.id] || '').trim());

  const save = async () => {
    setError('');
    if (!form.domain || !form.year || !form.division || form.rollNo === '' || form.prn === '') {
      setError('Please fill Domain, Year, Division, Roll No and PRN.');
      return;
    }
    if (requiredCustomMissing) {
      setError('Please answer all required fields added by your teacher.');
      return;
    }
    setSaving(true);
    try {
      saveProfile(form);
      localStorage.setItem('examFields_' + roomId, JSON.stringify(custom));
      saveCustomFieldsMeta(roomId, authFields);
      const userEmail = localStorage.getItem('userEmail');
      if (userEmail) {
        try {
          const customAnswers = authFields
            .filter(f => (custom[f.id] || '').trim())
            .map(f => ({ id: f.id, label: f.label, value: String(custom[f.id]).trim() }));
          await setDoc(doc(db, 'users', userEmail), { profile: { ...form, name: localStorage.getItem('userName') || '' } }, { merge: true });
          await setDoc(doc(db, 'users', userEmail), { examAnswers: { [roomId]: customAnswers } }, { merge: true });
        } catch (e) {
          console.warn('Could not persist profile to Firestore', e);
        }
      }
      onSaved && onSaved();
      onClose && onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const fieldLabel = (text, color) => (
    <span className="neo-badge" style={{ background: color, fontSize: '11px', marginBottom: '6px' }}>{text}</span>
  );

  const renderCustomField = (f) => {
    if (f.type === 'select') {
      return (
        <div style={{ position: 'relative' }}>
          <select
            className="neo-input"
            style={{ width: '100%', cursor: 'pointer' }}
            value={custom[f.id] || ''}
            onChange={e => setCustomVal(f.id, e.target.value)}
          >
            <option value="">Select {f.label}...</option>
            {(f.options || []).filter(o => o.trim()).map((o, oi) => <option key={oi} value={o}>{o}</option>)}
          </select>
          <ChevronDown size={16} style={{ position: 'absolute', right: 10, top: 10, pointerEvents: 'none' }} />
        </div>
      );
    }
    return (
      <input
        type={f.type || 'text'}
        className="neo-input"
        style={{ width: '100%' }}
        placeholder={f.placeholder || f.label}
        value={custom[f.id] || ''}
        onChange={e => setCustomVal(f.id, e.target.value)}
      />
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000 }}>
      <div className="neo-window" onClick={e => e.stopPropagation()} style={{ width: '520px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="neo-window-header" style={{ background: 'var(--accent-yellow)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: '900', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}><User size={18} /> Your Exam Profile</span>
          <button onClick={onClose} style={{ background: 'var(--surface-color)', border: '2px solid #000', cursor: 'pointer', padding: '2px' }}><X size={16} /></button>
        </div>
        <div className="neo-window-content" style={{ padding: '16px', background: 'var(--surface-color)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '13px', fontWeight: '600', margin: 0 }}>
            This information is used to build the exam master sheet. It is sorted by designation, domain, year, division and roll no.
            {authFields.length > 0 && ' Your teacher also added extra fields below.'}
          </p>

          <div>
            {fieldLabel('Designation (from your sign-in role)', 'var(--accent-pink)')}
            <select className="neo-input" style={{ width: '100%', cursor: 'pointer' }} value={form.designation} onChange={e => set('designation', e.target.value)}>
              {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              {fieldLabel('Domain', 'var(--accent-purple)')}
              <select className="neo-input" style={{ width: '100%', cursor: 'pointer' }} value={form.domain} onChange={e => set('domain', e.target.value)}>
                <option value="">Select domain</option>
                {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              {fieldLabel('Year', 'var(--accent-blue)')}
              <select className="neo-input" style={{ width: '100%', cursor: 'pointer' }} value={form.year} onChange={e => set('year', e.target.value)}>
                <option value="">Select year</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              {fieldLabel('Division', 'var(--accent-green)')}
              <select className="neo-input" style={{ width: '100%', cursor: 'pointer' }} value={form.division} onChange={e => set('division', e.target.value)}>
                <option value="">Select division</option>
                {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              {fieldLabel('Roll No', 'var(--accent-orange)')}
              <input type="number" className="neo-input" style={{ width: '100%' }} placeholder="e.g. 12" value={form.rollNo} onChange={e => set('rollNo', e.target.value)} />
            </div>
          </div>

          <div>
            {fieldLabel('PRN', 'var(--accent-pink)')}
            <input type="number" className="neo-input" style={{ width: '100%' }} placeholder="e.g. 22030141000" value={form.prn} onChange={e => set('prn', e.target.value)} />
          </div>

          {authFields.length > 0 && (
            <div style={{ borderTop: '3px dashed #000', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span className="neo-badge" style={{ background: 'var(--accent-purple)', fontSize: '12px', display: 'inline-block' }}>
                Your teacher added these fields
              </span>
              {authFields.map(f => (
                <div key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {fieldLabel(f.label + (f.required ? ' *' : ''), f.required ? 'var(--accent-pink)' : 'var(--accent-blue)')}
                  {renderCustomField(f)}
                </div>
              ))}
            </div>
          )}

          {error && <span className="neo-badge" style={{ background: '#ff5f56', color: 'var(--surface-color)', display: 'block', textAlign: 'center' }}>{error}</span>}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button className="neo-btn" onClick={onClose} style={{ background: 'var(--surface-color)' }}>Cancel</button>
            <button className="neo-btn" onClick={save} disabled={saving} style={{ background: 'var(--accent-green)' }}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
