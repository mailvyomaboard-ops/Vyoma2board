import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function RosterModal({ roomId, onClose }) {
  const [roster, setRoster] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [submissions, setSubmissions] = useState({});

  // CSV Import States
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState(null);
  const [columnMap, setColumnMap] = useState({ name: '', email: '', userId: '' });
  const [customFields, setCustomFields] = useState([]); // [{ id: '1', name: 'PRN', csvColumn: '' }]
  const fileInputRef = React.useRef(null);
  
  // Attendance State
  const [todayAttendance, setTodayAttendance] = useState({});
  const todayKey = () => new Date().toISOString().slice(0, 10);

  const load = async () => {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const snap = await getDoc(roomRef);
      if (snap.exists()) {
        setRoster(snap.data().roster || []);
      }
      const subsRef = collection(db, 'rooms', roomId, 'submissions');
      const subsSnap = await getDocs(subsRef);
      const map = {};
      subsSnap.forEach(sd => {
        const d = sd.data();
        map[sd.id] = { submittedAt: d.submittedAt, obtained: d.obtainedMarks, total: d.totalMarks, status: d.status };
      });
      setSubmissions(map);

      // Load attendance
      const attRef = doc(db, 'rooms', roomId, 'attendance', todayKey());
      const attSnap = await getDoc(attRef);
      if (attSnap.exists()) {
        setTodayAttendance(attSnap.data().students || {});
      }
    } catch (e) {
      console.error('Failed to load roster', e);
    }
  };

  useEffect(() => { load(); }, [roomId]);

  const saveRoster = async (next) => {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      await setDoc(roomRef, { roster: next }, { merge: true });
      setRoster(next);
    } catch (e) {
      alert('Failed to save roster: ' + e.message);
    }
  };

  const addStudent = async () => {
    if (!name.trim()) { alert('Enter a student name.'); return; }
    const entry = {
      userId: userId.trim() || 'student-' + Date.now(),
      name: name.trim(),
      email: email.trim() || ''
    };
    if (roster.find(r => r.userId === entry.userId || (r.email && entry.email && r.email === entry.email))) {
      alert('That student is already in the roster.');
      return;
    }
    await saveRoster([...roster, entry]);
    setName(''); setEmail(''); setUserId('');
  };

  const removeStudent = async (entry) => {
    if (!window.confirm(`Remove ${entry.name} from the roster?`)) return;
    await saveRoster(roster.filter(r => r.userId !== entry.userId));
  };

  // --- CSV IMPORT LOGIC ---
  const parseCSV = (text) => {
    const lines = [];
    let currentLine = [];
    let currentCell = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < text.length && text[i + 1] === '"') {
            currentCell += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          currentCell += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          currentLine.push(currentCell.trim());
          currentCell = '';
        } else if (char === '\n' || char === '\r') {
          if (char === '\r' && i + 1 < text.length && text[i + 1] === '\n') i++;
          currentLine.push(currentCell.trim());
          if (currentLine.some(c => c)) lines.push(currentLine);
          currentLine = [];
          currentCell = '';
        } else {
          currentCell += char;
        }
      }
    }
    if (currentCell || currentLine.length > 0) {
      currentLine.push(currentCell.trim());
      if (currentLine.some(c => c)) lines.push(currentLine);
    }
    return lines;
  };

  const autoMapColumns = (headers) => {
    const map = { name: '', email: '', userId: '' };
    const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    headers.forEach(h => {
      const n = normalize(h);
      if (!map.name && (n.includes('name') || n === 'student' || n === 'fullname' || n === 'first')) {
        map.name = h;
      } else if (!map.email && (n.includes('email') || n.includes('mail') || n === 'contact')) {
        map.email = h;
      } else if (!map.userId && (n.includes('id') || n.includes('roll') || n.includes('user') || n.includes('reg'))) {
        map.userId = h;
      }
    });
    return map;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const parsed = parseCSV(text);
      if (parsed.length < 2) {
        alert('CSV file must have a header row and at least one data row.');
        return;
      }
      const headers = parsed[0];
      const rows = parsed.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i] || ''; });
        return obj;
      });
      setCsvHeaders(headers);
      setCsvRows(rows);
      setColumnMap(autoMapColumns(headers));
    };
    reader.readAsText(file);
    e.target.value = null; // reset
  };

  const confirmCsvImport = async () => {
    if (!columnMap.name) {
      alert('You must select a column for the Student Name.');
      return;
    }
    
    const newStudents = [];
    let duplicatesSkipped = 0;
    let duplicateIdsFixed = 0;

    csvRows.forEach(row => {
      const sName = row[columnMap.name] || '';
      const sEmail = columnMap.email ? (row[columnMap.email] || '') : '';
      let sId = columnMap.userId ? (row[columnMap.userId] || '') : '';
      
      if (!sName.trim()) return;

      let finalId = sId.trim() || `student-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      
      // If the ID already exists in the roster or new batch, it's a collision.
      // Since the user might have accidentally mapped a non-unique column (like "School ID") to User ID,
      // we shouldn't drop the student. Instead, we make the ID unique.
      const isIdCollision = roster.some(r => r.userId === finalId) || newStudents.some(r => r.userId === finalId);
      
      if (isIdCollision) {
        finalId = `${finalId}-${Math.random().toString(36).substr(2, 4)}`;
        duplicateIdsFixed++;
      }

      const entry = { name: sName.trim(), email: sEmail.trim(), userId: finalId, customFields: {} };
      
      customFields.forEach(cf => {
        if (cf.name && cf.csvColumn) {
          entry.customFields[cf.name] = row[cf.csvColumn] || '';
        }
      });

      // Now we only skip if the EMAIL is an exact match and not empty.
      // We NEVER skip based on name (people can have the same name).
      const isEmailDup = entry.email && (roster.some(r => r.email === entry.email) || newStudents.some(r => r.email === entry.email));
      
      if (!isEmailDup) {
        newStudents.push(entry);
      } else {
        duplicatesSkipped++;
      }
    });

    if (newStudents.length === 0) {
      alert(`No new students found. ${duplicatesSkipped > 0 ? `(${duplicatesSkipped} skipped due to duplicate Emails)` : ''}`);
      setCsvRows(null);
      return;
    }

    await saveRoster([...roster, ...newStudents]);
    alert(`Successfully imported ${newStudents.length} students! ${duplicatesSkipped > 0 ? `(${duplicatesSkipped} skipped due to duplicate Emails). ` : ''}${duplicateIdsFixed > 0 ? `(Fixed ${duplicateIdsFixed} duplicate IDs)` : ''}`);
    setCsvRows(null);
  };
  // --- END CSV LOGIC ---

  const exportCsv = () => {
    const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const header = ['Name', 'Email', 'User ID', 'Submission Status', 'Score', 'Submitted At'];
    const rows = roster.map((entry) => {
      const sub = submissions[entry.userId];
      return [
        entry.name,
        entry.email || '',
        entry.userId,
        sub ? (sub.status === 'graded' ? 'Graded' : 'Submitted') : 'No submission',
        sub ? `${sub.obtained}/${sub.total}` : '',
        sub && sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : ''
      ].map(esc).join(',');
    });
    const csv = [header.map(esc).join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roster-${roomId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99998 }}>
      <div className="neo-window" onClick={e => e.stopPropagation()} style={{ width: '560px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="neo-window-header" style={{ background: 'var(--accent-blue)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: '900', textTransform: 'uppercase' }}>
            {csvRows ? 'Map CSV Columns' : 'Class Roster'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {!csvRows && (
              <>
                <button onClick={() => fileInputRef.current?.click()} className="neo-btn" style={{ background: 'var(--surface-color)', padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }} title="Import CSV">
                  <FileSpreadsheet size={14} /> Import CSV
                </button>
                <input type="file" ref={fileInputRef} accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
              </>
            )}
            {!csvRows && roster.length > 0 && (
              <>
                <button onClick={async () => {
                  if (window.confirm("Are you sure you want to delete the entire class roster? This cannot be undone.")) {
                    await saveRoster([]);
                  }
                }} className="neo-btn" style={{ background: '#ff4444', color: 'var(--surface-color)', padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }} title="Clear Roster">
                  <Trash2 size={14} /> Clear
                </button>
                <button onClick={exportCsv} className="neo-btn" style={{ background: 'var(--accent-green)', padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }} title="Download CSV">
                  <Download size={14} /> Export
                </button>
              </>
            )}
            <button onClick={onClose} style={{ background: 'var(--surface-color)', border: '2px solid #000', cursor: 'pointer', padding: '2px' }}><X size={16} /></button>
          </div>
        </div>
        <div className="neo-window-content" style={{ padding: '16px', background: 'var(--surface-color)', overflowY: 'auto' }}>
          {csvRows ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#FAFAFA', border: '2px solid #000', padding: '16px', boxShadow: '4px 4px 0 #000' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800' }}>Confirm Column Mapping</h4>
                <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#555' }}>We automatically detected these columns. Please correct them if they are wrong.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>Name (Required)</label>
                    <select className="neo-input" style={{ width: '100%', padding: '6px' }} value={columnMap.name} onChange={e => setColumnMap({ ...columnMap, name: e.target.value })}>
                      <option value="">-- Select Column --</option>
                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>Email (Optional)</label>
                    <select className="neo-input" style={{ width: '100%', padding: '6px' }} value={columnMap.email} onChange={e => setColumnMap({ ...columnMap, email: e.target.value })}>
                      <option value="">-- Select Column --</option>
                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>User ID / Roll No (Optional)</label>
                    <select className="neo-input" style={{ width: '100%', padding: '6px' }} value={columnMap.userId} onChange={e => setColumnMap({ ...columnMap, userId: e.target.value })}>
                      <option value="">-- Select Column --</option>
                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
                
                <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px', fontWeight: '800' }}>Custom Fields</h4>
                {customFields.map((cf, i) => (
                  <div key={cf.id} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <input className="neo-input" placeholder="Field Name (e.g. PRN)" value={cf.name} onChange={e => {
                      const c = [...customFields]; c[i].name = e.target.value; setCustomFields(c);
                    }} style={{ flex: 1, padding: '6px' }} />
                    <select className="neo-input" style={{ flex: 1, padding: '6px' }} value={cf.csvColumn} onChange={e => {
                      const c = [...customFields]; c[i].csvColumn = e.target.value; setCustomFields(c);
                    }}>
                      <option value="">-- Select Column --</option>
                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <button onClick={() => setCustomFields(customFields.filter(f => f.id !== cf.id))} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                  </div>
                ))}
                <button className="neo-btn" style={{ background: '#eee', padding: '6px 12px', fontSize: '12px', marginTop: '8px' }} onClick={() => setCustomFields([...customFields, { id: Date.now().toString(), name: '', csvColumn: '' }])}>
                  + Add Custom Field
                </button>
              </div>

              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '800' }}>Preview (First 3 rows)</h4>
                <div style={{ overflowX: 'auto', border: '2px solid #000' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#eee' }}>
                        {csvHeaders.map(h => (
                          <th key={h} style={{ padding: '6px 8px', borderBottom: '2px solid #000', borderRight: '1px solid #ccc' }}>
                            {h}
                            {h === columnMap.name ? ' (Name)' : h === columnMap.email ? ' (Email)' : h === columnMap.userId ? ' (ID)' : ''}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.slice(0, 3).map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #ccc' }}>
                          {csvHeaders.map(h => <td key={h} style={{ padding: '6px 8px', borderRight: '1px solid #ccc' }}>{r[h]}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button className="neo-btn" onClick={() => setCsvRows(null)} style={{ background: 'var(--surface-color)', padding: '8px 16px' }}>Cancel</button>
                <button className="neo-btn" onClick={confirmCsvImport} style={{ background: 'var(--accent-green)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Upload size={16} /> Import {csvRows.length} Students
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <input type="text" className="neo-input" placeholder="Student name" value={name} onChange={e => setName(e.target.value)} style={{ flex: 1, minWidth: '120px' }} />
            <input type="text" className="neo-input" placeholder="Email (optional)" value={email} onChange={e => setEmail(e.target.value)} style={{ flex: 1, minWidth: '140px' }} />
            <input type="text" className="neo-input" placeholder="User ID (optional)" value={userId} onChange={e => setUserId(e.target.value)} style={{ flex: 1, minWidth: '120px' }} />
            <button className="neo-btn" onClick={addStudent} style={{ background: 'var(--accent-green)', padding: '8px 14px' }}>
              <UserPlus size={16} /> Add
            </button>
          </div>

          {roster.length === 0 ? (
            <div className="neo-card" style={{ textAlign: 'center', padding: '24px', background: '#FAFAFA' }}>
              <span style={{ fontSize: '14px', fontWeight: '700' }}>No students in the roster yet. Add students so you can track submissions and attendance.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: '#FAFAFA', border: '2px solid #000' }}>
                <span style={{ fontSize: '13px', fontWeight: '800' }}>Attendance: {Object.keys(todayAttendance).length} / {roster.length} Present</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="neo-btn" style={{ background: 'var(--accent-green)', padding: '4px 10px', fontSize: '12px' }} onClick={async () => {
                    const merged = { ...todayAttendance };
                    roster.forEach(r => merged[r.userId] = { name: r.name, manual: true });
                    setTodayAttendance(merged);
                    await setDoc(doc(db, 'rooms', roomId, 'attendance', todayKey()), { date: todayKey(), students: merged, updatedAt: new Date().toISOString() });
                  }}>Present All</button>
                  <button className="neo-btn" style={{ background: '#ff4444', color: 'var(--surface-color)', padding: '4px 10px', fontSize: '12px' }} onClick={async () => {
                    setTodayAttendance({});
                    await setDoc(doc(db, 'rooms', roomId, 'attendance', todayKey()), { date: todayKey(), students: {}, updatedAt: new Date().toISOString() });
                  }}>Clear All</button>
                </div>
              </div>
              
              {roster.map((entry, i) => {
                const sub = submissions[entry.userId];
                const isPresent = !!todayAttendance[entry.userId];
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', border: '3px solid #000', padding: '10px 12px', background: isPresent ? '#e8ffe8' : 'var(--surface-color)', boxShadow: '2px 2px 0 #000' }}>
                    <input type="checkbox" checked={isPresent} onChange={async (e) => {
                      const merged = { ...todayAttendance };
                      if (e.target.checked) merged[entry.userId] = { name: entry.name, manual: true };
                      else delete merged[entry.userId];
                      setTodayAttendance(merged);
                      await setDoc(doc(db, 'rooms', roomId, 'attendance', todayKey()), { date: todayKey(), students: merged, updatedAt: new Date().toISOString() });
                    }} style={{ width: '18px', height: '18px', cursor: 'pointer' }} title="Mark Attendance" />
                    <div style={{ width: '32px', height: '32px', border: '2px solid #000', background: 'var(--accent-yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' }}>
                      {entry.name[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '800', fontSize: '14px' }}>{entry.name}</div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>
                        {entry.email || `ID: ${entry.userId.slice(0, 12)}`}
                        {entry.customFields && Object.entries(entry.customFields).map(([k, v]) => ` • ${k}: ${v}`).join('')}
                      </div>
                    </div>
                    {sub ? (
                      <span className="neo-badge" style={{ background: sub.status === 'graded' ? 'var(--accent-green)' : 'var(--accent-yellow)', fontSize: '11px' }}>
                        <CheckCircle2 size={12} /> {sub.status === 'graded' ? 'Graded' : 'Submitted'} {sub.obtained}/{sub.total}
                      </span>
                    ) : (
                      <span className="neo-badge" style={{ background: '#eee', fontSize: '11px' }}><Clock size={12} /> No submission</span>
                    )}
                    <button className="neo-btn" style={{ background: 'var(--surface-color)', padding: '6px' }} onClick={() => removeStudent(entry)} title="Remove">
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <p style={{ fontSize: '12px', fontWeight: '600', marginTop: '16px', color: '#555' }}>
            Share this exam link with your class: <strong>/exam/{roomId}</strong>
          </p>
        </>
      )}
    </div>
      </div>
    </div>
  );
}
