import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, setDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { CalendarClock, Play, PencilRuler, Table2, BarChart3 } from 'lucide-react';
import { loadRoomHistory, addRoomToHistory } from '../lib/roomHistory';
import { loadProfile, loadCustomFields } from '../lib/examProfile';
import { classMetaLabel, isLabLike, isTeacherRole, isAssignedTeacher } from '../lib/classMeta';
import { YEARS, DOMAINS, DIVISIONS, CLASS_TYPES } from '../lib/classMeta';
import '../index.css';

const userId = () => localStorage.getItem('userId') || '';
const userRole = () => localStorage.getItem('userRole') || 'Casual';
const userName = () => localStorage.getItem('userName') || 'Anonymous';

export default function Exams() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);       // { id, doc }
  const [loading, setLoading] = useState(true);
  const [showNewExam, setShowNewExam] = useState(false);
  const [schedulingId, setSchedulingId] = useState(null);
  const [submitted, setSubmitted] = useState({}); // roomId -> bool
  const [subCounts, setSubCounts] = useState({}); // roomId -> int

  const load = useCallback(async () => {
    setLoading(true);
    const map = {};
    const history = loadRoomHistory().filter(r => r.kind === 'exam');

    // 1. Rooms the user knows about (local history).
    for (const h of history) {
      try {
        const snap = await getDoc(doc(db, 'rooms', h.id));
        if (snap.exists()) map[h.id] = snap.data();
      } catch (e) { /* ignore */ }
    }

    // 2. Best-effort discovery query (works if Firestore rules allow collection queries).
    try {
      const q = query(collection(db, 'rooms'), where('kind', '==', 'exam'));
      const qs = await getDocs(q);
      qs.forEach(sd => { if (!map[sd.id]) map[sd.id] = sd.data(); });
    } catch (e) {
      console.warn('Exam discovery query unavailable, using local history only', e);
    }

    const ids = Object.keys(map);
    setRooms(ids.map(id => ({ id, doc: map[id] })));

    // Submission state for the current user + counts for teachers.
    const me = userId();
    const subs = {};
    const counts = {};
    await Promise.all(ids.map(async (id) => {
      try {
        const subSnap = await getDoc(doc(db, 'rooms', id, 'submissions', me));
        subs[id] = subSnap.exists();
        const coll = await getDocs(collection(db, 'rooms', id, 'submissions'));
        counts[id] = coll.size;
      } catch (e) { /* ignore */ }
    }));
    setSubmitted(subs);
    setSubCounts(counts);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const role = userRole();
  const isTeacher = isTeacherRole(role);

  const examStatus = (room) => {
    const cfg = room.exam || {};
    if (!cfg.enabled) return { key: 'draft', label: 'Draft' };
    const now = Date.now();
    const open = cfg.openAt ? new Date(cfg.openAt).getTime() : null;
    const close = cfg.closeAt ? new Date(cfg.closeAt).getTime() : null;
    if (open && now < open) return { key: 'upcoming', label: `Starts ${new Date(open).toLocaleString()}` };
    if (close && now > close) return { key: 'closed', label: 'Closed' };
    return { key: 'open', label: 'Open now' };
  };

  // Which exams are visible to this user.
  const visible = useCallback(({ id, doc: room }) => {
    if (isTeacher) {
      return isAssignedTeacher(room, userId()) || room.hostId === userId() || room.createdBy === userId();
    }
    const cm = room.classMeta;
    if (cm) {
      const profile = loadProfile();
      const batch = loadCustomFields(id).find(c => c.label === 'Batch')?.value;
      const matchesProfile = cm.year === profile.year && cm.branch === profile.domain
        && (isLabLike(cm) ? (cm.batches || []).includes(batch) : cm.division === profile.division);
      if (matchesProfile) return true;
    }
    const roster = Array.isArray(room.roster) ? room.roster : [];
    return roster.some(r => r.userId === userId());
  }, [isTeacher]);

  const list = rooms.filter(visible);

  const createExam = async (form) => {
    const newId = Math.random().toString(36).substring(2, 8) + '-' + Math.random().toString(36).substring(2, 8);
    const cm = {
      year: form.year, branch: form.branch,
      subject: form.subject.trim(), courseCode: form.courseCode.trim() || form.subject.trim(),
      type: form.type, term: form.term, academicYear: form.academicYear
    };
    if (isLabLike(form)) { cm.batches = form.batches; cm.batch = form.batch || (form.batches[0] || ''); }
    else cm.division = form.division;

    await setDoc(doc(db, 'rooms', newId), {
      name: form.title.trim() || 'Untitled Exam',
      kind: 'exam',
      hostId: userId(),
      hostName: userName(),
      createdBy: userId(),
      createdByRole: role,
      roles: { [userId()]: 'admin' },
      classMeta: cm,
      exam: { title: form.title.trim() || 'Untitled Exam', durationMinutes: Number(form.duration) || 45, enabled: false, authFields: [] },
      createdAt: serverTimestamp(),
      parentId: null
    });
    addRoomToHistory(newId, form.title.trim() || 'Untitled Exam', null, 'exam');
    navigate(`/exam-editor/${newId}`);
  };

  const NewExamForm = () => {
    const [f, setF] = useState({ title: '', year: '', branch: '', subject: '', courseCode: '', type: 'theory', division: '', batchesText: '', batch: '', duration: 45, term: '', academicYear: '' });
    const [err, setErr] = useState('');
    const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));
    const batches = () => f.batchesText.split(',').map(s => s.trim()).filter(Boolean);
    const labLike = isLabLike(f);
    const submit = async () => {
      if (!f.title.trim() || !f.year || !f.branch || !f.subject.trim()) return setErr('Title, Year, Branch and Subject are required.');
      if (labLike && batches().length === 0) return setErr('Add at least one batch.');
      if (!labLike && !f.division) return setErr('Pick a division for a theory exam.');
      await createExam({ ...f, batches: batches() });
    };
    return (
      <div className="modal-overlay" onClick={() => setShowNewExam(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99998 }}>
        <div className="neo-window" onClick={e => e.stopPropagation()} style={{ width: '560px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
          <div className="neo-window-header" style={{ background: 'var(--accent-green)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: '900', textTransform: 'uppercase' }}>New Exam</span>
            <button onClick={() => setShowNewExam(false)} style={{ background: 'var(--surface-color)', border: '2px solid #000', cursor: 'pointer', padding: '2px' }}><X size={16} /></button>
          </div>
          <div className="neo-window-content" style={{ padding: '16px', background: 'var(--surface-color)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input type="text" className="neo-input" placeholder="Exam title (e.g. Unit Test 1)" value={f.title} onChange={e => set('title', e.target.value)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <select className="neo-input" value={f.year} onChange={e => set('year', e.target.value)}><option value="">Year</option>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select>
              <select className="neo-input" value={f.branch} onChange={e => set('branch', e.target.value)}><option value="">Branch</option>{DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}</select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <input type="text" className="neo-input" placeholder="Subject (e.g. Data Structures)" value={f.subject} onChange={e => set('subject', e.target.value)} />
              <input type="text" className="neo-input" placeholder="Course code (e.g. CS301)" value={f.courseCode} onChange={e => set('courseCode', e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {CLASS_TYPES.map(t => (
                <button key={t.id} className="neo-btn" onClick={() => set('type', t.id)} style={{ background: f.type === t.id ? 'var(--accent-yellow)' : 'var(--surface-color)', padding: '6px 14px', fontSize: '13px' }}>{t.label}</button>
              ))}
            </div>
            {!labLike ? (
              <select className="neo-input" value={f.division} onChange={e => set('division', e.target.value)}><option value="">Division</option>{DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}</select>
            ) : (
              <>
                <input type="text" className="neo-input" placeholder="Batches (comma separated, e.g. A1, A2)" value={f.batchesText} onChange={e => set('batchesText', e.target.value)} />
                <select className="neo-input" value={f.batch} onChange={e => set('batch', e.target.value)}><option value="">This exam's batch</option>{batches().map(b => <option key={b} value={b}>{b}</option>)}</select>
              </>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <input type="number" className="neo-input" min="0" placeholder="Duration (min)" value={f.duration} onChange={e => set('duration', e.target.value)} />
              <input type="text" className="neo-input" placeholder="Term (e.g. Sem I)" value={f.term} onChange={e => set('term', e.target.value)} />
              <input type="text" className="neo-input" placeholder="Acad year" value={f.academicYear} onChange={e => set('academicYear', e.target.value)} />
            </div>
            {err && <span className="neo-badge" style={{ background: '#ff5f56', color: 'var(--surface-color)', display: 'block', textAlign: 'center' }}>{err}</span>}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="neo-btn" onClick={() => setShowNewExam(false)} style={{ background: 'var(--surface-color)' }}>Cancel</button>
              <button className="neo-btn" onClick={submit} style={{ background: 'var(--accent-green)' }}>Create & Open Editor</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: 'var(--board-bg)', color: '#000' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="neo-btn" onClick={() => navigate('/dashboard')} style={{ background: 'var(--accent-yellow)', padding: '8px 12px' }}>
              <ArrowLeft size={18} /> Dashboard
            </button>
            <span className="neo-title-block" style={{ fontSize: '24px', background: 'var(--accent-pink)' }}>Exams</span>
            <span className="neo-badge" style={{ background: 'var(--accent-green)', fontSize: '12px' }}>{isTeacher ? 'Teacher view' : 'Student view'}</span>
          </div>
          {isTeacher && (
            <button className="neo-btn" onClick={() => setShowNewExam(true)} style={{ background: 'var(--accent-green)', padding: '10px 16px', fontSize: '14px' }}>
              <Plus size={18} /> New Exam
            </button>
          )}
        </div>

        {!isTeacher && (
          <div className="neo-card" style={{ background: 'var(--accent-yellow)', padding: '14px', marginBottom: '24px' }}>
            <span style={{ fontSize: '13px', fontWeight: '800' }}>
              Your profile (branch, year, division/batch) decides which exams appear here. Fill it in from the exam's details form if you don't see your exams.
            </span>
          </div>
        )}

        {loading ? (
          <div className="neo-card" style={{ textAlign: 'center', padding: '40px', background: 'var(--surface-color)' }}><span style={{ fontSize: '16px', fontWeight: '900' }}>Loading exams...</span></div>
        ) : list.length === 0 ? (
          <div className="neo-card" style={{ textAlign: 'center', padding: '40px', background: 'var(--surface-color)' }}>
            <span className="neo-badge" style={{ background: 'var(--accent-yellow)', fontSize: '16px' }}>
              {isTeacher ? 'No exams yet. Create one with "New Exam".' : 'No exams scheduled for your class yet.'}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {list.map(({ id, doc: room }) => {
              const status = examStatus(room);
              const taken = submitted[id];
              const canTake = status.key === 'open' && !taken;
              const actions = [];
              if (isTeacher) {
                actions.push({ label: 'Edit Questions', icon: PencilRuler, bg: 'var(--accent-blue)', go: () => navigate(`/exam-editor/${id}`) });
                actions.push({ label: 'Schedule', icon: CalendarClock, bg: 'var(--accent-pink)', go: () => setSchedulingId(id) });
                actions.push({ label: 'Take / Preview', icon: Play, bg: 'var(--accent-green)', go: () => navigate(`/exam/${id}`) });
                actions.push({ label: 'Results', icon: Table2, bg: 'var(--accent-purple)', go: () => navigate(`/gradebook/${id}`) });
                actions.push({ label: 'Analytics', icon: BarChart3, bg: 'var(--accent-orange)', go: () => navigate(`/analytics/${id}`) });
              } else {
                actions.push({ label: taken ? 'Taken' : (canTake ? 'Take Exam' : status.label), icon: Play, bg: 'var(--accent-green)', disabled: !canTake, go: () => navigate(`/exam/${id}`) });
              }
              return (
                <div key={id} className="neo-card" style={{ background: 'var(--surface-color)', padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '900', fontSize: '16px' }}>{room.exam?.title || room.name || id}</div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#555', marginTop: '4px' }}>{classMetaLabel(room.classMeta)}</div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                        <span className="neo-badge" style={{ background: status.key === 'open' ? 'var(--accent-green)' : status.key === 'closed' ? '#eee' : 'var(--accent-yellow)', fontSize: '11px' }}>{status.label}</span>
                        {isTeacher && <span className="neo-badge" style={{ background: 'var(--accent-blue)', fontSize: '11px' }}>{subCounts[id] || 0} submission{(subCounts[id] || 0) === 1 ? '' : 's'}</span>}
                        {taken && <span className="neo-badge" style={{ background: 'var(--accent-purple)', fontSize: '11px' }}>You have taken this</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {actions.map((a, i) => (
                        <button
                          key={i}
                          className="neo-btn"
                          disabled={a.disabled}
                          onClick={a.go}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: a.bg, padding: '6px 12px', fontSize: '12px', opacity: a.disabled ? 0.5 : 1 }}
                        >
                          <a.icon size={14} /> {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showNewExam && <NewExamForm />}
      {schedulingId && <ExamScheduleModal roomId={schedulingId} onClose={() => setSchedulingId(null)} />}
    </div>
  );
}
