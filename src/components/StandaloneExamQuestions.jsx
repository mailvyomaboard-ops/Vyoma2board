import { useState } from 'react';
import { getExamAnswer, setExamAnswer } from '../lib/examSession';

// MCQ Component
export const StandaloneMcq = ({ shape }) => {
  const { question, option1, option2, option3, option4, marks, hint, hintText } = shape.props;
  const [localSel, setLocalSel] = useState(() => (getExamAnswer(shape.id) && getExamAnswer(shape.id).value) || 0);
  const [showHint, setShowHint] = useState(false);

  const options = [
    { id: 1, value: option1 },
    { id: 2, value: option2 },
    { id: 3, value: option3 },
    { id: 4, value: option4 }
  ];

  const onPick = (id) => {
    setLocalSel(id);
    setExamAnswer(shape.id, { type: 'mcq', value: id });
  };

  return (
    <div className="neo-card" style={{ width: '100%', maxWidth: '800px', margin: '0 auto 32px auto', background: 'var(--surface-color)', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '3px solid #000', paddingBottom: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', textTransform: 'uppercase' }}>Multiple Choice</h3>
        <span style={{ fontSize: '14px', fontWeight: '800' }}>Marks: {marks}</span>
      </div>

      <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', whiteSpace: 'pre-wrap' }}>
        {question}
      </div>

      {hint && (
        <div style={{ marginBottom: '16px' }}>
          <button onClick={() => setShowHint(!showHint)} style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '3px solid #B8860B', padding: '6px 12px', fontWeight: '900', fontSize: '12px', cursor: 'pointer', background: showHint ? 'var(--accent-yellow)' : 'var(--surface-color)', color: '#B8860B' }}>
            <Lightbulb size={16} /> {showHint ? 'Hide Hint' : 'Hint'}
          </button>
          {showHint && (
            <div style={{ marginTop: '8px', padding: '12px', border: '3px solid #B8860B', borderRadius: '8px', background: 'linear-gradient(90deg,#FFF8E1,#FFE9A8)', color: '#B8860B', fontStyle: 'italic', fontWeight: '700', fontSize: '14px' }}>
              {hintText || 'Hint'}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {options.map(opt => {
          const isSelected = localSel === opt.id;
          return (
            <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', border: '3px solid #000', background: isSelected ? 'var(--accent-yellow)' : 'var(--surface-color)', transition: 'all 0.1s' }}>
              <input type="radio" name={`mcq-${shape.id}`} checked={isSelected} onChange={() => onPick(opt.id)} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--accent-pink)' }} />
              <span style={{ fontSize: '16px', fontWeight: isSelected ? '700' : '500' }}>{opt.value}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

// Written Component
export const StandaloneWritten = ({ shape }) => {
  const { question, marks, expectedLines, hint, hintText } = shape.props;
  const [localAns, setLocalAns] = useState(() => (getExamAnswer(shape.id) && getExamAnswer(shape.id).value) || '');
  const [showHint, setShowHint] = useState(false);

  const onChange = (val) => {
    setLocalAns(val);
    setExamAnswer(shape.id, { type: 'written', value: val });
  };

  return (
    <div className="neo-card" style={{ width: '100%', maxWidth: '800px', margin: '0 auto 32px auto', background: 'var(--surface-color)', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '3px solid #000', paddingBottom: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', textTransform: 'uppercase' }}>Written Response</h3>
        <span style={{ fontSize: '14px', fontWeight: '800' }}>Marks: {marks}</span>
      </div>

      <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', whiteSpace: 'pre-wrap' }}>
        {question}
      </div>

      {hint && (
        <div style={{ marginBottom: '16px' }}>
          <button onClick={() => setShowHint(!showHint)} style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '3px solid #B8860B', padding: '6px 12px', fontWeight: '900', fontSize: '12px', cursor: 'pointer', background: showHint ? 'var(--accent-yellow)' : 'var(--surface-color)', color: '#B8860B' }}>
            <Lightbulb size={16} /> {showHint ? 'Hide Hint' : 'Hint'}
          </button>
          {showHint && (
            <div style={{ marginTop: '8px', padding: '12px', border: '3px solid #B8860B', borderRadius: '8px', background: 'linear-gradient(90deg,#FFF8E1,#FFE9A8)', color: '#B8860B', fontStyle: 'italic', fontWeight: '700', fontSize: '14px' }}>
              {hintText || 'Hint'}
            </div>
          )}
        </div>
      )}

      <textarea
        placeholder="Type your answer here..."
        value={localAns}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', minHeight: `${Math.max(100, (expectedLines || 5) * 24)}px`, border: '3px solid #000', padding: '12px', fontFamily: 'Inter', fontSize: '16px', resize: 'vertical' }}
      />
    </div>
  );
};

// Code Component
export const StandaloneCode = ({ shape }) => {
  const { question, marks, languages, hint, hintText } = shape.props;
  const initialAnswer = getExamAnswer(shape.id)?.value;
  const [localCode, setLocalCode] = useState(initialAnswer?.code || languages[0]?.template || '');
  const [localLang, setLocalLang] = useState(initialAnswer?.langId || languages[0]?.id || 'c');
  const [showHint, setShowHint] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');

  const onCodeChange = (val) => {
    setLocalCode(val);
    setExamAnswer(shape.id, { type: 'code', value: { code: val, langId: localLang } });
  };

  const onLangChange = (id) => {
    setLocalLang(id);
    const langObj = languages.find(l => l.id === id);
    if (langObj) {
      setLocalCode(langObj.template);
      setExamAnswer(shape.id, { type: 'code', value: { code: langObj.template, langId: id } });
    }
  };

  const executeCode = async () => {
    setIsRunning(true);
    setOutput('Running...');
    try {
      const btoaSafe = (str) => btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode('0x' + p1)));
      const atobSafe = (str) => decodeURIComponent(Array.prototype.map.call(atob(str), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      
      const numericalLangId = {
        'c': 50, 'cpp': 54, 'python': 71, 'java': 62, 'javascript': 63, 'csharp': 51, 'go': 60
      }[localLang] || 71;

      const res = await fetch('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=true', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'Content-Type': 'application/json',
          'x-rapidapi-key': import.meta.env.VITE_JUDGE0_API_KEY || 'dummy',
          'x-rapidapi-host': 'judge0-ce.p.rapidapi.com'
        },
        body: JSON.stringify({
          source_code: btoaSafe(localCode),
          language_id: numericalLangId,
        })
      });
      if (!res.ok) throw new Error('Execution failed');
      const data = await res.json();
      
      let finalOutput = '';
      if (data.stdout) finalOutput += atobSafe(data.stdout) + '\n';
      if (data.stderr) finalOutput += 'ERROR:\n' + atobSafe(data.stderr) + '\n';
      if (data.compile_output) finalOutput += 'COMPILE ERROR:\n' + atobSafe(data.compile_output) + '\n';
      const outStr = finalOutput.trim() || 'Process exited with code 0 (No output)';
      setOutput(outStr);
      setExamAnswer(shape.id, { type: 'code', value: { code: localCode, langId: localLang, output: outStr } });
    } catch (e) {
      const errStr = 'Failed to execute code. Try again later.';
      setOutput(errStr);
      setExamAnswer(shape.id, { type: 'code', value: { code: localCode, langId: localLang, output: errStr } });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="neo-card" style={{ width: '100%', maxWidth: '800px', margin: '0 auto 32px auto', background: 'var(--surface-color)', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '3px solid #000', paddingBottom: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', textTransform: 'uppercase' }}>Coding Problem</h3>
        <span style={{ fontSize: '14px', fontWeight: '800' }}>Marks: {marks}</span>
      </div>

      <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', whiteSpace: 'pre-wrap' }}>
        {question}
      </div>

      {hint && (
        <div style={{ marginBottom: '16px' }}>
          <button onClick={() => setShowHint(!showHint)} style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '3px solid #B8860B', padding: '6px 12px', fontWeight: '900', fontSize: '12px', cursor: 'pointer', background: showHint ? 'var(--accent-yellow)' : 'var(--surface-color)', color: '#B8860B' }}>
            <Lightbulb size={16} /> {showHint ? 'Hide Hint' : 'Hint'}
          </button>
          {showHint && (
            <div style={{ marginTop: '8px', padding: '12px', border: '3px solid #B8860B', borderRadius: '8px', background: 'linear-gradient(90deg,#FFF8E1,#FFE9A8)', color: '#B8860B', fontStyle: 'italic', fontWeight: '700', fontSize: '14px' }}>
              {hintText || 'Hint'}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        {languages.map(l => (
          <button key={l.id} onClick={() => onLangChange(l.id)} style={{ border: '3px solid #000', padding: '6px 12px', fontWeight: '900', fontSize: '12px', cursor: 'pointer', background: localLang === l.id ? 'var(--accent-blue)' : 'var(--surface-color)', color: localLang === l.id ? 'var(--surface-color)' : '#000' }}>
            {l.id.toUpperCase()}
          </button>
        ))}
        <button onClick={executeCode} disabled={isRunning} className="neo-btn" style={{ marginLeft: 'auto', background: 'var(--accent-green)', padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isRunning ? <Loader2 size={14} className="spin" /> : <Play size={14} />} {isRunning ? 'Running...' : 'Run Code'}
        </button>
      </div>

      <div style={{ border: '3px solid #000', height: '300px', marginBottom: '12px' }}>
        <Editor
          height="100%"
          language={localLang}
          value={localCode}
          onChange={(val) => onCodeChange(val || '')}
          theme="light"
          options={{ minimap: { enabled: false }, fontSize: 14, fontFamily: 'Fira Code', padding: { top: 12 } }}
        />
      </div>

      {output && (
        <div style={{ background: '#1e1e1e', color: '#00ff00', padding: '12px', border: '3px solid #000', borderRadius: '4px', fontFamily: 'Fira Code, monospace', fontSize: '13px', whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto' }}>
          {output}
        </div>
      )}
    </div>
  );
};
