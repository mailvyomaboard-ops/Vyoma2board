import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import '../index.css';

const ID = () => Math.random().toString(36).substring(2, 10);

export default function ExamEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [examConfig, setExamConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'rooms', id));
        if (snap.exists()) {
          const data = snap.data();
          setExamConfig(data.exam || {});
          setQuestions(data.exam?.questions || []);
        } else {
          alert('Exam not found!');
          navigate('/exams');
        }
      } catch (e) {
        alert('Failed to load exam: ' + e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  const save = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'rooms', id), {
        'exam.questions': questions
      });
      alert('Saved successfully!');
    } catch (e) {
      alert('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const addMcq = () => {
    setQuestions([...questions, {
      id: ID(),
      type: 'quiz-mcq-shape',
      props: {
        question: 'New Multiple Choice Question',
        option1: 'Option 1', option2: 'Option 2', option3: 'Option 3', option4: 'Option 4',
        correctOption: 1, marks: 1, hint: false, hintText: ''
      }
    }]);
  };

  const addWritten = () => {
    setQuestions([...questions, {
      id: ID(),
      type: 'quiz-written-shape',
      props: {
        question: 'New Written Question',
        marks: 5, expectedLines: 5, hint: false, hintText: '', expectedAnswer: ''
      }
    }]);
  };

  const addCode = () => {
    setQuestions([...questions, {
      id: ID(),
      type: 'quiz-code-shape',
      props: {
        question: 'New Coding Problem',
        marks: 10, hint: false, hintText: '',
        languages: [{ id: 'c', template: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}' }],
        expectedOutput: ''
      }
    }]);
  };

  const updateQuestion = (index, field, value) => {
    const newQ = [...questions];
    newQ[index].props[field] = value;
    setQuestions(newQ);
  };

  const deleteQuestion = (index) => {
    if (window.confirm('Delete this question?')) {
      const newQ = [...questions];
      newQ.splice(index, 1);
      setQuestions(newQ);
    }
  };

  const moveQuestion = (index, dir) => {
    if (index + dir < 0 || index + dir >= questions.length) return;
    const newQ = [...questions];
    const temp = newQ[index];
    newQ[index] = newQ[index + dir];
    newQ[index + dir] = temp;
    setQuestions(newQ);
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', fontWeight: 'bold' }}>Loading Editor...</div>;

  return (
    <div style={{ backgroundColor: '#F0F4FF', minHeight: '100vh', paddingBottom: '100px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--surface-color)', borderBottom: '4px solid #000', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="neo-btn" onClick={() => navigate('/exams')} style={{ background: 'var(--accent-yellow)', padding: '8px 12px' }}><ArrowLeft size={16} /> Back</button>
          <h2 style={{ margin: 0, fontWeight: '900', fontSize: '20px' }}>{examConfig?.title || 'Exam Editor'}</h2>
        </div>
        <button className="neo-btn" onClick={save} disabled={saving} style={{ background: 'var(--accent-green)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save Exam'}
        </button>
      </div>

      <div style={{ maxWidth: '800px', margin: '40px auto 0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {questions.map((q, idx) => (
          <div key={q.id} className="neo-card" style={{ background: 'var(--surface-color)', padding: '24px', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '-40px', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button onClick={() => moveQuestion(idx, -1)} disabled={idx === 0} style={{ background: 'var(--surface-color)', border: '2px solid #000', cursor: idx === 0 ? 'not-allowed' : 'pointer' }}>▲</button>
              <button onClick={() => moveQuestion(idx, 1)} disabled={idx === questions.length - 1} style={{ background: 'var(--surface-color)', border: '2px solid #000', cursor: idx === questions.length - 1 ? 'not-allowed' : 'pointer' }}>▼</button>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '3px solid #000', paddingBottom: '8px' }}>
              <span className="neo-badge" style={{ background: 'var(--accent-blue)', fontSize: '12px' }}>
                {q.type === 'quiz-mcq-shape' ? 'Multiple Choice' : q.type === 'quiz-written-shape' ? 'Written' : 'Code'}
              </span>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontWeight: '800', fontSize: '14px' }}>Marks:</span>
                <input type="number" value={q.props.marks} onChange={e => updateQuestion(idx, 'marks', parseInt(e.target.value) || 0)} style={{ width: '60px', border: '3px solid #000', padding: '4px', fontWeight: 'bold' }} />
                <button onClick={() => deleteQuestion(idx)} style={{ background: '#ff4444', color: 'var(--surface-color)', border: '3px solid #000', padding: '4px', cursor: 'pointer', borderRadius: '4px' }}><Trash2 size={16} /></button>
              </div>
            </div>

            <textarea 
              value={q.props.question} 
              onChange={e => updateQuestion(idx, 'question', e.target.value)} 
              placeholder="Question text..."
              style={{ width: '100%', minHeight: '80px', border: '3px solid #000', padding: '12px', fontFamily: 'Inter', fontSize: '16px', resize: 'vertical', marginBottom: '16px' }}
            />

            {q.type === 'quiz-mcq-shape' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3, 4].map(optNum => (
                  <label key={optNum} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="radio" name={`mcq-correct-${q.id}`} checked={q.props.correctOption === optNum} onChange={() => updateQuestion(idx, 'correctOption', optNum)} style={{ width: '20px', height: '20px', accentColor: 'var(--accent-pink)', cursor: 'pointer' }} title="Mark as correct" />
                    <input type="text" value={q.props[`option${optNum}`]} onChange={e => updateQuestion(idx, `option${optNum}`, e.target.value)} style={{ flex: 1, border: '3px solid #000', padding: '8px', fontSize: '14px', background: q.props.correctOption === optNum ? 'var(--accent-yellow)' : 'var(--surface-color)' }} />
                  </label>
                ))}
              </div>
            )}

            {q.type === 'quiz-written-shape' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', fontSize: '14px' }}>Expected Lines (Editor Height):</span>
                  <input type="number" value={q.props.expectedLines} onChange={e => updateQuestion(idx, 'expectedLines', parseInt(e.target.value) || 5)} style={{ width: '60px', border: '3px solid #000', padding: '4px' }} />
                </div>
                <textarea 
                  value={q.props.expectedAnswer || ''} 
                  onChange={e => updateQuestion(idx, 'expectedAnswer', e.target.value)} 
                  placeholder="Expected answer (optional, for manual grading reference)"
                  style={{ width: '100%', minHeight: '60px', border: '3px solid #000', padding: '12px', fontFamily: 'Inter', fontSize: '14px', resize: 'vertical', background: '#f9f9f9' }}
                />
              </div>
            )}

            {q.type === 'quiz-code-shape' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 <p style={{ fontWeight: '700', fontSize: '14px', margin: 0 }}>Languages available for this question:</p>
                 <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['c', 'cpp', 'python', 'java', 'javascript', 'go'].map(lang => {
                      const hasLang = q.props.languages.some(l => l.id === lang);
                      return (
                        <button key={lang} onClick={() => {
                          let newLangs = [...q.props.languages];
                          if (hasLang) newLangs = newLangs.filter(l => l.id !== lang);
                          else newLangs.push({ id: lang, template: `// Default template for ${lang}` });
                          if (newLangs.length === 0) newLangs.push({ id: 'python', template: 'print("Hello World")' });
                          updateQuestion(idx, 'languages', newLangs);
                        }} style={{ border: '3px solid #000', padding: '4px 8px', fontSize: '12px', fontWeight: '900', background: hasLang ? 'var(--accent-green)' : 'var(--surface-color)', cursor: 'pointer' }}>
                          {lang.toUpperCase()}
                        </button>
                      );
                    })}
                 </div>
              </div>
            )}

          </div>
        ))}

        {questions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', background: 'var(--surface-color)', border: '4px dashed #ccc', borderRadius: '12px' }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#888' }}>No questions added yet. Click below to add one!</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
          <button className="neo-btn" onClick={addMcq} style={{ background: 'var(--surface-color)' }}><Plus size={16}/> Add MCQ</button>
          <button className="neo-btn" onClick={addWritten} style={{ background: 'var(--surface-color)' }}><Plus size={16}/> Add Written</button>
          <button className="neo-btn" onClick={addCode} style={{ background: 'var(--surface-color)' }}><Plus size={16}/> Add Code</button>
        </div>
      </div>
    </div>
  );
}
