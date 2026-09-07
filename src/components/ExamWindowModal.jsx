import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { loadProfile, profileComplete } from '../lib/examProfile';

export default function ExamWindowModal({ roomId, examName, onClose, onEdit }) {
  const navigate = useNavigate();
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [authFields, setAuthFields] = useState([]);

  useEffect(() => {
    const loadFields = async () => {
      try {
        const snap = await getDoc(doc(db, 'rooms', roomId));
        const exam = snap.exists() ? snap.data().exam : null;
        setAuthFields((exam && Array.isArray(exam.authFields)) ? exam.authFields : []);
      } catch (e) {
        console.error('Failed to load exam auth fields', e);
      }
    };
    loadFields();
  }, [roomId]);

  const role = localStorage.getItem('userRole') || 'Casual';
  const name = localStorage.getItem('userName') || 'User';
  const profile = loadProfile();

  // Teachers and interviewers can both edit the exam AND take it.
  const canEdit = ['Teacher', 'Interviewer'].includes(role);
  const canTake = ['Teacher', 'Interviewer', 'Student', 'Interviewee', 'Casual', 'Employee', 'Manager'].includes(role);

  const isEditorRole = canEdit;

  const customValues = (() => {
    try { return JSON.parse(localStorage.getItem('examFields_' + roomId) || '{}'); }
    catch (e) { return {}; }
  })();

  const requiredCustomMissing = authFields.some(f => f.required && !(customValues[f.id] || '').trim());

  if (showProfileSetup) {
    return <ProfileSetupModal authFields={authFields} roomId={roomId} onClose={() => setShowProfileSetup(false)} onSaved={() => setShowProfileSetup(false)} />;
  }

  const needsProfile = !profileComplete(profile) || requiredCustomMissing;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000 }}>
      <div className="neo-window" onClick={e => e.stopPropagation()} style={{ width: '480px' }}>
        <div className="neo-window-header" style={{ background: 'var(--accent-green)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: '900', textTransform: 'uppercase' }}>📄 {examName || 'Exam.exam'}</span>
          <button onClick={onClose} style={{ background: 'var(--surface-color)', border: '2px solid #000', cursor: 'pointer', padding: '2px' }}><X size={16} /></button>
        </div>

        <div className="neo-window-content" style={{ padding: '20px', background: 'var(--surface-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Authentication check */}
          <div className="neo-card" style={{ background: isEditorRole ? 'var(--accent-blue)' : 'var(--accent-yellow)', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', border: '3px solid #000', background: 'var(--surface-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {canTake ? <ShieldCheck size={22} /> : <UserX size={22} />}
              </div>
              <div>
                <div style={{ fontWeight: '900', fontSize: '15px' }}>Signed in as {name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span className="neo-badge" style={{ background: 'var(--surface-color)', fontSize: '11px' }}>{role}</span>
                  <span style={{ fontSize: '12px', fontWeight: '700' }}>
                    {isEditorRole ? '· Editor access granted' : '· Test access only'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {needsProfile && (
            <div className="neo-card" style={{ background: '#FBEA72', padding: '14px' }}>
              <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '6px' }}>Your exam details are incomplete</div>
              <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px' }}>
                Fill in your details for this test. This builds your row in the master sheet.
                {authFields.length > 0 && ' It also includes the fields your teacher added to the form.'}
              </div>
              <button className="neo-btn" onClick={() => setShowProfileSetup(true)} style={{ background: 'var(--accent-pink)' }}>
                Complete Details
              </button>
            </div>
          )}

          {/* Access buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {canTake && (
              <button
                className="neo-btn"
                disabled={needsProfile}
                style={{ background: 'var(--accent-green)', padding: '14px', fontSize: '15px', opacity: needsProfile ? 0.5 : 1 }}
                onClick={() => {
                  if (needsProfile) return alert('Complete your exam details first.');
                  navigate(`/exam/${roomId}`);
                }}
              >
                <ClipboardCheck size={20} /> Give Test (Start Exam)
              </button>
            )}

            {isEditorRole && (
              <button
                className="neo-btn"
                style={{ background: 'var(--accent-blue)', padding: '14px', fontSize: '15px' }}
                onClick={() => {
                  onClose();
                  if (onEdit) onEdit();
                }}
              >
                <PencilRuler size={20} /> Edit Exam
              </button>
            )}

            {isEditorRole && (
              <button
                className="neo-btn"
                style={{ background: 'var(--accent-green)', padding: '14px', fontSize: '15px' }}
                onClick={() => {
                  onClose();
                  navigate(`/gradebook/${roomId}`);
                }}
              >
                <Table2 size={20} /> Results (Master Spreadsheet)
              </button>
            )}

            {!canTake && (
              <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: '700' }}>
                You do not have permission to take this exam with this role.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '600', color: '#555' }}>
            <GraduationCap size={14} />
            {isEditorRole
              ? 'Edit Exam opens the Exam Editor to build MCQ, Text or Code questions. Results opens the sorted master spreadsheet. Give Test launches the locked-down exam surface.'
              : 'You can only take the test. Editing is restricted to teachers and interviewers.'}
          </div>
        </div>
      </div>
    </div>
  );
}
