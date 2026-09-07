import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowLeft, Download, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { buildMasterRows } from '../lib/examProfile';

export default function Gradebook() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [roomInfo, setRoomInfo] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState({}); // shapeId->userId -> value
  const [saving, setSaving] = useState(null);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const roomRef = doc(db, 'rooms', id);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) setRoomInfo(roomSnap.data());

      const subsRef = collection(db, 'rooms', id, 'submissions');
      const subsSnap = await getDocs(subsRef);
      const rows = [];
      subsSnap.forEach(sd => rows.push({ uid: sd.id, ...sd.data() }));
      rows.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
      setSubmissions(rows);
    } catch (e) {
      console.error('Failed to load gradebook', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSubmissions(); }, [id]);

  const saveGrade = async (sub, qIndex, shapeId) => {
    const val = Number(grading[`${sub.uid}:${shapeId}`] ?? '');
    if (isNaN(val) || val === '') { alert('Enter a numeric score.'); return; }
    if (val < 0 || val > (sub.answers[qIndex].marks || 1)) {
      alert(`Score must be between 0 and ${sub.answers[qIndex].marks}.`);
      return;
    }
    setSaving(shapeId + sub.uid);
    const answers = sub.answers.map((a, i) => i === qIndex ? { ...a, score: val, status: 'manual' } : a);
    const totalMarks = answers.reduce((sum, a) => sum + (a.marks || 1), 0);
    const obtainedMarks = answers.reduce((sum, a) => sum + (a.score || 0), 0);
    const pendingManual = answers.filter(a => a.status === 'pending').length;
    const updated = { ...sub, answers, totalMarks, obtainedMarks, pendingManual, status: pendingManual > 0 ? 'submitted' : 'graded' };

    try {
      const subRef = doc(db, 'rooms', id, 'submissions', sub.uid);
      await updateDoc(subRef, {
        answers,
        totalMarks,
        obtainedMarks,
        pendingManual,
        status: pendingManual > 0 ? 'submitted' : 'graded'
      });
      setSubmissions(prev => prev.map(s => s.uid === sub.uid ? updated : s));
      setGrading(prev => { const c = { ...prev }; delete c[`${sub.uid}:${shapeId}`]; return c; });
      alert(`Saved score for ${sub.studentName}.`);
    } catch (e) {
      alert('Failed to save grade: ' + e.message);
    } finally {
      setSaving(null);
    }
  };

  const deleteSubmission = async (sub) => {
    if (!window.confirm(`Delete ${sub.studentName}'s submission?`)) return;
    try {
      await deleteDoc(doc(db, 'rooms', id, 'submissions', sub.uid));
      setSubmissions(prev => prev.filter(s => s.uid !== sub.uid));
    } catch (e) {
      alert('Failed to delete: ' + e.message);
    }
  };

  const exportCSV = () => {
    if (submissions.length === 0) { alert('No submissions to export.'); return; }
    let csv = 'Student,Status,Auto Score,Manual Score,Total,Obtained,Submitted At\n';
    submissions.forEach(s => {
      const manual = s.answers?.filter(a => a.status === 'manual').reduce((sum, a) => sum + (a.score || 0), 0) || 0;
      const auto = (s.obtainedMarks || 0) - manual;
      csv += `"${(s.studentName || 'Unknown').replace(/"/g, '""')}",${s.status || 'submitted'},${auto},${manual},${s.totalMarks || 0},${s.obtainedMarks || 0},"${s.submittedAt || ''}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Gradebook_${id}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    if (submissions.length === 0) { alert('No submissions to export.'); return; }
    const docPdf = new jsPDF();
    docPdf.setFontSize(18);
    docPdf.text(`Gradebook: ${roomInfo?.name || id}`, 14, 20);
    docPdf.setFontSize(11);
    let y = 32;
    submissions.forEach((s, i) => {
      const manual = s.answers?.filter(a => a.status === 'manual').reduce((sum, a) => sum + (a.score || 0), 0) || 0;
      const auto = (s.obtainedMarks || 0) - manual;
      if (y > 280) { docPdf.addPage(); y = 20; }
      docPdf.text(`${i + 1}. ${s.studentName || 'Unknown'}  |  ${s.status || 'submitted'}  |  Auto: ${auto}  Manual: ${manual}  |  ${s.obtainedMarks || 0}/${s.totalMarks || 0}`, 14, y);
      y += 7;
    });
    docPdf.save(`Gradebook_${id}_${Date.now()}.pdf`);
  };

  // Master sheet: every test-taker, sorted by designation -> domain -> year -> division -> roll no.
  const exportMasterXLSX = () => {
    const rows = buildMasterRows(submissions);
    if (rows.length === 0) { alert('No submissions to export.'); return; }
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0]).map(() => ({ wch: 16 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Exam Records');
    XLSX.writeFile(wb, `Exam_Master_Sheet_${id}_${Date.now()}.xlsx`);
  };

  const exportMasterCSV = () => {
    const rows = buildMasterRows(submissions);
    if (rows.length === 0) { alert('No submissions to export.'); return; }
    const headers = Object.keys(rows[0]);
    let csv = headers.join(',') + '\n';
    rows.forEach(r => {
      csv += headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Exam_Master_Sheet_${id}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFAF0' }}>
        <div className="neo-card" style={{ padding: '40px', background: 'var(--surface-color)' }}>
          <span style={{ fontSize: '18px', fontWeight: '900' }}>Loading Gradebook...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: 'var(--board-bg)', color: '#000' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="neo-btn" onClick={() => navigate(`/board/${id}`)} style={{ background: 'var(--accent-yellow)', padding: '8px 12px' }}>
              <ArrowLeft size={18} /> Back to Board
            </button>
            <span className="neo-title-block" style={{ fontSize: '24px', background: 'var(--accent-green)' }}>Gradebook</span>
            <span className="neo-badge" style={{ background: 'var(--accent-pink)', fontSize: '12px' }}>{roomInfo?.name || id}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="neo-btn" onClick={exportMasterXLSX} style={{ background: 'var(--accent-green)' }}><Download size={16} /> Master Sheet (XLSX)</button>
            <button className="neo-btn" onClick={exportMasterCSV} style={{ background: 'var(--accent-yellow)' }}><Download size={16} /> Master CSV</button>
            <button className="neo-btn" onClick={exportCSV} style={{ background: 'var(--accent-blue)' }}><Download size={16} /> CSV</button>
            <button className="neo-btn" onClick={exportPDF} style={{ background: 'var(--accent-purple)' }}><Download size={16} /> PDF</button>
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="neo-card" style={{ textAlign: 'center', padding: '40px', background: 'var(--surface-color)' }}>
            <span className="neo-badge" style={{ background: 'var(--accent-yellow)', fontSize: '16px' }}>No submissions yet. Share the exam link with students.</span>
            <p style={{ fontSize: '14px', fontWeight: '600', marginTop: '12px' }}>Exam link: /exam/{id}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {submissions.map(sub => (
              <div key={sub.uid} className="neo-card" style={{ background: 'var(--surface-color)', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', border: '3px solid #000', background: 'var(--accent-pink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' }}>
                      {sub.studentName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontWeight: '900', fontSize: '16px' }}>{sub.studentName || 'Unknown'}</div>
                      <div style={{ fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : '—'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="neo-badge" style={{ background: sub.status === 'graded' ? 'var(--accent-green)' : 'var(--accent-yellow)', fontSize: '12px' }}>
                      {sub.status === 'graded' ? <CheckCircle2 size={12} /> : 'Pending' } {sub.status}
                    </span>
                    <span className="neo-badge" style={{ background: 'var(--accent-purple)', fontSize: '14px' }}>
                      Score: {sub.obtainedMarks || 0}/{sub.totalMarks || 0}
                    </span>
                    <button className="neo-btn" style={{ background: 'var(--surface-color)', padding: '6px' }} onClick={() => deleteSubmission(sub)} title="Delete submission">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {sub.answers?.map((a, qi) => (
                    <div key={a.shapeId + qi} style={{ border: '2px solid #000', padding: '12px', background: a.status === 'manual' ? '#EEF7EE' : 'var(--surface-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: '800', fontSize: '14px', flex: 1 }}>
                          Q{qi + 1} ({a.type === 'mcq' ? 'MCQ' : a.type === 'code' ? 'Code' : 'Written'}, {a.marks} marks): {a.question || '(no question)'}
                        </div>
                        <div style={{ fontWeight: '900' }}>
                          {a.score !== null ? `${a.score}/${a.marks}` : 'Ungraded'}
                        </div>
                      </div>

                      {a.type === 'mcq' ? (
                        <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: '600' }}>
                          Student answer: {a.studentAnswer ? `Option ${a.studentAnswer} — ${a.options?.[a.studentAnswer - 1] || ''}` : '(no answer)'}
                          {a.studentAnswer > 0 && (
                            <span style={{ marginLeft: '8px', fontWeight: '900', color: a.studentAnswer === a.correctOption ? '#157347' : '#b02a37' }}>
                              {a.studentAnswer === a.correctOption ? '✓ Correct' : '✗ Incorrect'}
                            </span>
                          )}
                        </div>
                      ) : a.type === 'code' ? (
                        <div style={{ marginTop: '8px' }}>
                          <div style={{ fontSize: '14px', fontWeight: '600' }}>
                            Language: {(a.studentAnswer?.language || 'c').toUpperCase()} · Compiled output:
                            <span style={{ marginLeft: '8px', fontWeight: '900', color: (a.studentAnswer?.output || '').trim() === (a.expectedOutput || '').trim() ? '#157347' : '#b02a37' }}>
                              {(a.studentAnswer?.output || '').trim() === (a.expectedOutput || '').trim() ? '✓ PASS' : '✗ FAIL'}
                            </span>
                          </div>
                          <div style={{ border: '2px solid #000', padding: '8px', fontFamily: "'Fira Code', monospace", fontSize: '13px', background: '#1e1e1e', color: '#a6e22e', whiteSpace: 'pre-wrap', marginTop: '4px' }}>
                            {a.studentAnswer?.output || '(no output)'}
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: '700', marginTop: '6px' }}>Submitted code:</div>
                          <div style={{ border: '2px dashed #000', padding: '8px', fontFamily: "'Fira Code', monospace", fontSize: '13px', background: '#FAFAFA', whiteSpace: 'pre-wrap', marginTop: '4px' }}>
                            {a.studentAnswer?.code || '(no code)'}
                          </div>
                          {a.status === 'pending' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                              <input
                                type="number"
                                min="0"
                                max={a.marks}
                                placeholder={`0-${a.marks}`}
                                value={grading[`${sub.uid}:${a.shapeId}`] ?? ''}
                                onChange={e => setGrading(prev => ({ ...prev, [`${sub.uid}:${a.shapeId}`]: e.target.value }))}
                                style={{ width: '80px', border: '3px solid #000', padding: '6px', fontWeight: 'bold' }}
                              />
                              <button className="neo-btn" style={{ background: 'var(--accent-green)', padding: '6px 12px' }} disabled={saving === a.shapeId + sub.uid} onClick={() => saveGrade(sub, qi, a.shapeId)}>
                                Save Grade
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ marginTop: '8px' }}>
                          <div style={{ fontSize: '14px', fontWeight: '600' }}>Student answer:</div>
                          <div style={{ border: '2px dashed #000', padding: '8px', fontSize: '14px', background: '#FAFAFA', whiteSpace: 'pre-wrap', marginTop: '4px' }}>
                            {a.studentAnswer || '(no answer)'}
                          </div>
                          {a.status === 'pending' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                              <input
                                type="number"
                                min="0"
                                max={a.marks}
                                placeholder={`0-${a.marks}`}
                                value={grading[`${sub.uid}:${a.shapeId}`] ?? ''}
                                onChange={e => setGrading(prev => ({ ...prev, [`${sub.uid}:${a.shapeId}`]: e.target.value }))}
                                style={{ width: '80px', border: '3px solid #000', padding: '6px', fontWeight: 'bold' }}
                              />
                              <button className="neo-btn" style={{ background: 'var(--accent-green)', padding: '6px 12px' }} disabled={saving === a.shapeId + sub.uid} onClick={() => saveGrade(sub, qi, a.shapeId)}>
                                {saving === a.shapeId + sub.uid ? 'Saving...' : 'Save Score'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
