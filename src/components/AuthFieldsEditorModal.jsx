import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Type, Hash, AtSign, List } from 'lucide-react';

const FIELD_TYPES = [
  { id: 'text', label: 'Text Box', icon: Type },
  { id: 'number', label: 'Number Box', icon: Hash },
  { id: 'email', label: 'Email Box', icon: AtSign },
  { id: 'select', label: 'Dropdown', icon: List }
];

const typeIcon = (t) => {
  const f = FIELD_TYPES.find(x => x.id === t);
  return f ? f.icon : Type;
};

export default function AuthFieldsEditorModal({ roomId, onClose }) {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'rooms', roomId));
        const exam = snap.exists() ? snap.data().exam : null;
        setFields((exam && Array.isArray(exam.authFields)) ? exam.authFields : []);
      } catch (e) {
        console.error('Failed to load auth fields', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [roomId]);

  const addField = () => setFields(prev => [
    ...prev,
    { id: 'f' + Date.now() + Math.random().toString(36).substring(2, 7), label: '', type: 'text', required: true, placeholder: '', options: [] }
  ]);

  const updateField = (idx, patch) => setFields(prev => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));

  const removeField = (idx) => setFields(prev => prev.filter((_, i) => i !== idx));

  const addOption = (idx) => updateField(idx, { options: [...(fields[idx].options || []), ''] });

  const updateOption = (idx, oi, val) => updateField(idx, { options: (fields[idx].options || []).map((o, j) => (j === oi ? val : o)) });

  const removeOption = (idx, oi) => updateField(idx, { options: (fields[idx].options || []).filter((_, j) => j !== oi) });

  const moveField = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[idx], next[target]] = [next[target], next[idx]];
    setFields(next);
  };

  const save = async () => {
    const clean = fields
      .filter(f => (f.label || '').trim())
      .map(f => ({
        ...f,
        label: f.label.trim(),
        placeholder: f.placeholder || '',
        options: f.type === 'select' ? (f.options || []).filter(o => (o || '').trim()) : []
      }));
    setSaving(true);
    try {
      await setDoc(doc(db, 'rooms', roomId), { exam: { authFields: clean } }, { merge: true });
      onClose();
    } catch (e) {
      alert('Failed to save form fields: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const fieldLabel = (text, color) => (
    <span className="neo-badge" style={{ background: color, fontSize: '10px', marginBottom: '4px', display: 'inline-block' }}>{text}</span>
  );

  return (
    <div className="modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100001 }}>
      <div className="neo-window" onClick={e => e.stopPropagation()} style={{ width: '640px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="neo-window-header" style={{ background: 'var(--accent-purple)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: '900', textTransform: 'uppercase' }}>👤 Student Details Form</span>
          <button onClick={onClose} style={{ background: 'var(--surface-color)', border: '2px solid #000', cursor: 'pointer', padding: '2px' }}><X size={16} /></button>
        </div>

        <div className="neo-window-content" style={{ padding: '16px', background: 'var(--surface-color)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '13px', fontWeight: '600', margin: 0 }}>
            These fields are shown to students <strong>before they start the test</strong> and are saved into their master-sheet row. Add text, number, email or dropdown fields. The dropdown lets you add its own options.
          </p>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', fontWeight: '800', color: '#555' }}>Loading form fields...</div>
          ) : fields.length === 0 ? (
            <div className="neo-card" style={{ background: '#FBEA72', padding: '20px', textAlign: 'center', fontWeight: '800' }}>
              No custom fields yet. Click <strong>Add Field</strong> to build the form students must fill in.
            </div>
          ) : (
            fields.map((f, idx) => {
              const Icon = typeIcon(f.type);
              return (
                <div key={f.id} className="neo-card" style={{ background: 'var(--surface-color)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button className="neo-btn" style={{ padding: '4px 8px', background: 'var(--surface-color)' }} title="Move up" onClick={() => moveField(idx, -1)}>↑</button>
                    <button className="neo-btn" style={{ padding: '4px 8px', background: 'var(--surface-color)' }} title="Move down" onClick={() => moveField(idx, 1)}>↓</button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Icon size={16} /> <span style={{ fontWeight: '800', fontSize: '12px' }}>Field {idx + 1}</span></div>
                    <button className="neo-btn" style={{ padding: '4px 8px', background: '#FFB7B2', marginLeft: 'auto' }} onClick={() => removeField(idx)} title="Remove field"><Trash2 size={14} /></button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '800' }}>Label / Question</label>
                      <input className="neo-input" value={f.label} onChange={e => updateField(idx, { label: e.target.value })} placeholder="e.g. Batch, Phone, Section..." />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '800' }}>Type</label>
                      <select className="neo-input" value={f.type} onChange={e => updateField(idx, { type: e.target.value })} style={{ cursor: 'pointer' }}>
                        {FIELD_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {f.type !== 'select' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '800' }}>Placeholder (optional)</label>
                      <input className="neo-input" value={f.placeholder || ''} onChange={e => updateField(idx, { placeholder: e.target.value })} placeholder="Hint shown inside the box" />
                    </div>
                  )}

                  {f.type === 'select' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label style={{ fontSize: '12px', fontWeight: '800' }}>Options</label>
                        <button className="neo-btn" style={{ padding: '4px 10px', background: 'var(--accent-green)', fontSize: '12px' }} onClick={() => addOption(idx)}>
                          <Plus size={14} /> Add option
                        </button>
                      </div>
                      {(f.options || []).length === 0 && (
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#888' }}>No options yet — students will only see a dropdown once you add options.</span>
                      )}
                      {(f.options || []).map((opt, oi) => (
                        <div key={oi} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input className="neo-input" value={opt} onChange={e => updateOption(idx, oi, e.target.value)} placeholder={`Option ${oi + 1}`} />
                          <button className="neo-btn" style={{ padding: '4px 8px', background: '#FFB7B2' }} onClick={() => removeOption(idx, oi)}><Trash2 size={14} /></button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!f.required} onChange={e => updateField(idx, { required: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: 'var(--accent-purple)' }} />
                    Required (students must fill this before starting)
                  </label>
                </div>
              );
            })
          )}

          <button className="neo-btn" style={{ background: 'var(--accent-blue)', padding: '12px', fontSize: '14px', display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }} onClick={addField}>
            <Plus size={18} /> Add Field
          </button>

          {/* Live preview */}
          {fields.some(f => f.label.trim()) && (
            <div className="neo-card" style={{ background: '#FBEA72', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '900', fontSize: '13px', marginBottom: '10px' }}>
                <UserRound size={16} /> STUDENT PREVIEW (before the test)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {fields.filter(f => f.label.trim()).map(f => (
                  <div key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {fieldLabel(f.label + (f.required ? ' *' : ''), 'var(--accent-pink)')}
                    {f.type === 'select' ? (
                      <div style={{ position: 'relative' }}>
                        <select disabled className="neo-input" style={{ width: '100%', background: 'var(--surface-color)', cursor: 'not-allowed' }}>
                          <option value="">Select {f.label}</option>
                          {(f.options || []).filter(o => o.trim()).map((o, oi) => <option key={oi} value={o}>{o}</option>)}
                        </select>
                        <ChevronDown size={16} style={{ position: 'absolute', right: 10, top: 10, pointerEvents: 'none' }} />
                      </div>
                    ) : (
                      <input disabled type={f.type} className="neo-input" style={{ width: '100%', background: 'var(--surface-color)', cursor: 'not-allowed' }} placeholder={f.placeholder || f.label} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button className="neo-btn" onClick={onClose} style={{ background: 'var(--surface-color)' }}>Cancel</button>
            <button className="neo-btn" onClick={save} disabled={saving} style={{ background: 'var(--accent-green)' }}>
              {saving ? 'Saving...' : 'Save Form Fields'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
