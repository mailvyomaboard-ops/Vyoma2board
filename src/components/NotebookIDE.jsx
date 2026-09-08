import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Plus, Trash2, ChevronUp, ChevronDown, Code, Type, Loader2, Upload, X, Eraser, FileText, Eye } from 'lucide-react';
import DOMPurify from 'dompurify';
import { getApiUrl } from '../config';

export default function NotebookIDE({
  fileData,
  content,
  folderFiles = [],
  onCodeChange,
  boardName,
  isEditing = true,
  onOpenFile,
  showFiles,
  setShowFiles,
  originShapeId
}) {
  const [cells, setCells] = useState([]);
  const [runningCellId, setRunningCellId] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [editingMarkdownId, setEditingMarkdownId] = useState(null);
  const fileInputRef = useRef(null);
  
  const handleEditorMount = (editor, monaco) => {
    const updateMaxHeight = () => {
      const contentHeight = editor.getContentHeight();
      const parent = editor.getDomNode().parentElement;
      if (parent) {
        // Minimum 250px, Maximum is content height + 1 line (21px)
        parent.style.maxHeight = `${Math.max(250, contentHeight + 21)}px`;
      }
    };
    editor.onDidContentSizeChange(updateMaxHeight);
    updateMaxHeight();

    // Auto-scroll the parent container when the user manually resizes the cell
    const domNode = editor.getDomNode();
    if (domNode && domNode.parentElement) {
      const parent = domNode.parentElement;
      let lastHeight = parent.getBoundingClientRect().height;
      const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          const currentHeight = entry.contentRect.height;
          if (currentHeight > lastHeight) {
            const diff = currentHeight - lastHeight;
            const scrollContainer = document.getElementById('notebook-scroll-container');
            if (scrollContainer) {
              scrollContainer.scrollTop += diff;
            }
          }
          lastHeight = currentHeight;
        }
      });
      observer.observe(parent);
    }
  };

  const [activeTab, setActiveTab] = useState('explorer'); // 'explorer' or 'uploads'

  // Initialize cells from content
  useEffect(() => {
    const initialContent = fileData?.content !== undefined ? fileData.content : content;
    try {
      if (initialContent) {
        const parsed = JSON.parse(initialContent);
        if (Array.isArray(parsed)) {
          setCells(parsed);
          return;
        }
      }
    } catch (e) {
      // Not JSON, initialize with single code cell
    }
    
    // Auto-detect language
    let extLanguage = 'python';
    if (fileData?.name) {
      const name = fileData.name.toLowerCase();
      if (name.endsWith('.java')) extLanguage = 'java';
      else if (name.endsWith('.js')) extLanguage = 'javascript';
      else if (name.endsWith('.c') || name.endsWith('.cpp')) extLanguage = 'c';
      else if (name.endsWith('.html')) extLanguage = 'html';
    }

    setCells([{ id: Date.now().toString(), type: 'code', content: initialContent || '', output: '', language: extLanguage }]);
  }, []); // Run once on mount

  // Sync state changes to parent (auto-save)
  const saveState = (newCells) => {
    setCells(newCells);
    onCodeChange(JSON.stringify(newCells, null, 2));
  };

  const handleRunCell = async (cell, index) => {
    
    setRunningCellId(cell.id);
    
    // Reset output for this cell using functional update to avoid stale closures
    setCells(prev => {
      const newCells = [...prev];
      newCells[index] = { ...newCells[index], output: '' };
      onCodeChange(JSON.stringify(newCells, null, 2));
      return newCells;
    });

    // HTML execution bypasses backend
    if (cell.language === 'html') {
      setCells(prev => {
        const newCells = prev.map(c => c.id === cell.id ? { ...c, output: cell.content } : c);
        onCodeChange(JSON.stringify(newCells, null, 2));
        return newCells;
      });
      setRunningCellId(prev => prev === cell.id ? null : prev);
      return;
    }

    try {
      try {
        const pistonLangMap = {
          python: { language: 'python', version: '3.10.0' },
          javascript: { language: 'javascript', version: '18.15.0' },
          java: { language: 'java', version: '15.0.2' },
          c: { language: 'c', version: '10.2.0' },
        };
        
        const targetLang = pistonLangMap[cell.language] || pistonLangMap.python;

        const response = await fetch(`https://emkc.org/api/v2/piston/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language: targetLang.language,
            version: targetLang.version,
            files: [
              ...folderFiles.map(f => ({ name: f.name, content: f.content })),
              ...uploadedFiles.map(f => ({ name: f.name, content: f.content })),
              { name: 'main', content: cell.content || '' }
            ]
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Execution failed');
        }

        const runResult = data.run || {};
        const output = runResult.output || runResult.stderr || runResult.stdout || 'No output';
        
        setCells(prev => {
          const newCells = prev.map(c => c.id === cell.id ? { ...c, output: output } : c);
          onCodeChange(JSON.stringify(newCells, null, 2));
          return newCells;
        });
      } catch (err) {
        setCells(prev => {
          const newCells = prev.map(c => c.id === cell.id ? { ...c, output: `Error: ${err.message}` } : c);
          onCodeChange(JSON.stringify(newCells, null, 2));
          return newCells;
        });
      } finally {
        setRunningCellId(prev => prev === cell.id ? null : prev);
      }
    } catch (e) {
      setCells(prev => {
        const newCells = prev.map(c => c.id === cell.id ? { ...c, output: `Execution failed: ${e.message}` } : c);
        onCodeChange(JSON.stringify(newCells, null, 2));
        return newCells;
      });
    } finally {
      setRunningCellId(prev => prev === cell.id ? null : prev);
    }
  };

  const handleRunAll = async () => {
    for (let i = 0; i < cells.length; i++) {
      if (cells[i].type === 'code') {
        await handleRunCell(cells[i], i);
      }
    }
  };

  const handleClearAllOutputs = () => {
    const newCells = cells.map(c => ({ ...c, output: '' }));
    saveState(newCells);
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setUploadedFiles(prev => [...prev.filter(f => f.name !== file.name), {
          id: Date.now().toString(),
          name: file.name,
          content: evt.target.result
        }]);
      };
      reader.readAsText(file);
    });
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addCell = (index, type = 'code') => {
    const newCell = { id: Date.now().toString() + Math.random().toString(36).substr(2, 5), type, content: '', output: '', language: 'python' };
    const newCells = [...cells];
    newCells.splice(index + 1, 0, newCell);
    saveState(newCells);
  };

  const removeCell = (index) => {
    if (cells.length === 1) return; // Prevent deleting the last cell
    const newCells = cells.filter((_, i) => i !== index);
    saveState(newCells);
  };

  const moveCell = (index, direction) => {
    if (direction === -1 && index === 0) return;
    if (direction === 1 && index === cells.length - 1) return;
    const newCells = [...cells];
    const temp = newCells[index];
    newCells[index] = newCells[index + direction];
    newCells[index + direction] = temp;
    saveState(newCells);
  };

  const updateCellContent = (index, newContent) => {
    const newCells = [...cells];
    newCells[index].content = newContent;
    saveState(newCells);
  };

  const updateCellLanguage = (index, newLang) => {
    const newCells = [...cells];
    newCells[index].language = newLang;
    saveState(newCells);
  };

  // Convert ANSI terminal output to plain text for simplicity (very basic regex)
  const stripAnsi = (str) => {
    return str.replace(/\x1b\[[0-9;]*m/g, '').replace(/\r\n/g, '\n').trim();
  };

  const renderMarkdown = (text) => {
    if (!text) return '<p style="color:#666"><em>Double click to edit markdown...</em></p>';
    // Very naive markdown parser
    let html = text
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/\n/gim, '<br/>');
    return DOMPurify.sanitize(html);
  };

  const renderOutput = (cell) => {
    const { output, language } = cell;
    if (!output) return null;
    
    if (language === 'html') {
      return (
        <div style={{ background: 'var(--surface-color)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
          {originShapeId && (
            <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('spawn-html-preview-card', {
                    detail: { originShapeId, content: output, name: `Cell Preview` }
                  }));
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'rgba(0,0,0,0.7)', color: 'var(--surface-color)',
                  border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px',
                  padding: '4px 8px', fontSize: '12px', cursor: 'pointer',
                  backdropFilter: 'none'
                }}
                title="Pop out this HTML to the Board Canvas"
              >
                <Eye size={14} /> Pop out to Canvas
              </button>
            </div>
          )}
          <iframe 
            srcDoc={output} 
            style={{ width: '100%', height: '300px', border: 'none', background: 'var(--surface-color)' }} 
            title="HTML Output"
            sandbox="allow-scripts"
          />
        </div>
      );
    }
    
    // Split output by the magic image tags
    const parts = output.split('__IMAGE_BASE64__');
    if (parts.length === 1) {
      return <div>{stripAnsi(output)}</div>;
    }

    const elements = [];
    elements.push(<div key="part-0">{stripAnsi(parts[0])}</div>);
    
    for (let i = 1; i < parts.length; i++) {
      const imgSplit = parts[i].split('__IMAGE_BASE64_END__');
      if (imgSplit.length >= 2) {
        const base64Str = imgSplit[0];
        const remainingText = imgSplit.slice(1).join('__IMAGE_BASE64_END__');
        
        elements.push(
          <div key={`img-${i}`} style={{ margin: '16px 0', background: 'var(--surface-color)', display: 'inline-block', borderRadius: 4, padding: 8 }}>
            <img src={`data:image/png;base64,${base64Str}`} alt="Matplotlib Output" style={{ maxWidth: '100%', height: 'auto' }} />
          </div>
        );
        
        if (remainingText.trim()) {
          elements.push(<div key={`text-${i}`}>{stripAnsi(remainingText)}</div>);
        }
      } else {
        // Malformed, just print it
        elements.push(<div key={`malformed-${i}`}>{stripAnsi('__IMAGE_BASE64__' + parts[i])}</div>);
      }
    }
    return elements;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#0a0a0c', color: '#e0e0e0', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: 'rgba(25, 25, 30, 0.9)', backdropFilter: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', zIndex: 10 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <button onClick={handleRunAll} style={{ background: '#bfff00', color: '#000', border: 'none', padding: '6px 16px', borderRadius: '20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Play size={16} fill="#000" /> Run All
          </button>
          <button onClick={() => addCell(-1, 'code')} style={{ background: 'transparent', color: '#bfff00', border: '1px solid rgba(191,255,0,0.5)', padding: '6px 16px', borderRadius: '20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Code size={16} /> + Code
          </button>
          <button onClick={() => addCell(-1, 'markdown')} style={{ background: 'transparent', color: '#bfff00', border: '1px solid rgba(191,255,0,0.5)', padding: '6px 16px', borderRadius: '20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Type size={16} /> + Text
          </button>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={handleClearAllOutputs} style={{ background: 'transparent', color: '#ff4444', border: '1px solid rgba(255,68,68,0.3)', padding: '6px 12px', borderRadius: '20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Eraser size={14} /> Clear Outputs
          </button>
          <button onClick={() => setShowFiles(!showFiles)} style={{ background: showFiles ? 'rgba(255,255,255,0.1)' : 'transparent', color: 'var(--surface-color)', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText size={14} /> Files ({uploadedFiles.length})
            <FileText size={14} /> Explorer
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {showFiles && (
          <div style={{ width: 280, background: '#0e0e11', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <button onClick={() => setActiveTab('explorer')} style={{ flex: 1, padding: '12px', background: activeTab === 'explorer' ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', color: activeTab === 'explorer' ? 'var(--surface-color)' : '#888', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Explorer</button>
              <button onClick={() => setActiveTab('uploads')} style={{ flex: 1, padding: '12px', background: activeTab === 'uploads' ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', color: activeTab === 'uploads' ? 'var(--surface-color)' : '#888', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Uploads</button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {activeTab === 'explorer' ? (
                <div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 12, textTransform: 'uppercase', fontWeight: 700 }}>Workspace Files</div>
                  {folderFiles.map(f => (
                    <div 
                      key={f.id} 
                      onClick={() => { if (onOpenFile) onOpenFile(f); }}
                      style={{ padding: '8px 12px', background: (fileData?.fileId === f.id || fileData?.originShapeId === f.id) ? 'rgba(191,255,0,0.1)' : 'rgba(255,255,255,0.02)', borderRadius: '6px', marginBottom: 8, fontSize: 13, cursor: 'pointer', color: (fileData?.fileId === f.id || fileData?.originShapeId === f.id) ? '#bfff00' : '#ccc' }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{f.name}</span>
                    </div>
                  ))}
                  {folderFiles.length === 0 && <div style={{ fontSize: 12, color: '#666', textAlign: 'center', marginTop: 32 }}>No files in workspace.</div>}
                </div>
              ) : (
                <div>
                  {uploadedFiles.map(f => (
                    <div key={f.id} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', marginBottom: 8, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{f.name}</span>
                      <button onClick={() => setUploadedFiles(prev => prev.filter(x => x.id !== f.id))} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer' }}><X size={14} /></button>
                    </div>
                  ))}
                  {uploadedFiles.length === 0 && (
                    <div style={{ fontSize: 12, color: '#666', textAlign: 'center', marginTop: 32 }}>
                      No local files attached.<br/>Upload files to read them in your code.
                    </div>
                  )}
                  <div style={{ marginTop: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', background: '#bfff00', color: 'black', borderRadius: '6px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                      <Upload size={16} /> Upload to Session
                      <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div id="notebook-scroll-container" style={{ flex: 1, overflowY: 'auto', padding: '24px 0' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {cells.map((cell, index) => (
                <div key={cell.id} style={{ background: '#131316', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: 12, color: '#888', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {cell.type === 'code' ? <Code size={14} color="#bfff00" /> : <Type size={14} color="#00ffcc" />}
                      {cell.type === 'code' && (
                        <select 
                          value={cell.language || 'python'} 
                          onChange={(e) => updateCellLanguage(index, e.target.value)}
                          style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--surface-color)', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: 11 }}
                        >
                          <option value="python" style={{ background: '#1a1a1a', color: 'var(--surface-color)' }}>Python</option>
                          <option value="javascript" style={{ background: '#1a1a1a', color: 'var(--surface-color)' }}>JavaScript</option>
                          <option value="typescript" style={{ background: '#1a1a1a', color: 'var(--surface-color)' }}>TypeScript (React)</option>
                          <option value="java" style={{ background: '#1a1a1a', color: 'var(--surface-color)' }}>Java</option>
                          <option value="c" style={{ background: '#1a1a1a', color: 'var(--surface-color)' }}>C / C++</option>
                          <option value="go" style={{ background: '#1a1a1a', color: 'var(--surface-color)' }}>Go</option>
                          <option value="rust" style={{ background: '#1a1a1a', color: 'var(--surface-color)' }}>Rust</option>
                          <option value="assembly" style={{ background: '#1a1a1a', color: 'var(--surface-color)' }}>Assembly</option>
                          <option value="html" style={{ background: '#1a1a1a', color: 'var(--surface-color)' }}>HTML</option>
                        </select>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button onClick={() => updateCellContent(index, '')} title="Clear cell content" style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Eraser size={14} /></button>
                      <button onClick={() => removeCell(index)} title="Delete cell" style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', position: 'relative' }}>
                    {cell.type === 'code' && (
                      <div style={{ width: 48, display: 'flex', justifyContent: 'center', background: '#0e0e11', position: 'relative' }}>
                        <div style={{ position: 'sticky', top: 12, height: 28, marginTop: 12 }}>
                          <button 
                            onClick={() => handleRunCell(cell, index)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', border: 'none', background: runningCellId === cell.id ? 'transparent' : 'rgba(191,255,0,0.1)', color: '#bfff00', cursor: 'pointer' }}
                          >
                            {runningCellId === cell.id ? <Loader2 size={16} className="spin" /> : <Play size={14} style={{ marginLeft: 2 }} />}
                          </button>
                        </div>
                      </div>
                    )}
                    <div style={{ flex: 1, padding: '12px', minWidth: 0 }}>
                      <div style={{ height: 250, minHeight: 250, resize: 'vertical', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', paddingBottom: '12px', background: '#1e1e1e' }}>
                        <Editor
                          height="100%"
                          language={cell.type === 'code' ? (cell.language || 'python') : 'markdown'}
                          value={cell.content}
                          onChange={(val) => updateCellContent(index, val)}
                          theme="vs-dark"
                          onMount={handleEditorMount}
                          options={{ 
                            minimap: { enabled: false }, 
                            fontSize: 14,
                            scrollBeyondLastLine: false,
                            wordWrap: 'off',
                            automaticLayout: true,
                            scrollbar: { vertical: 'auto', horizontal: 'auto' },
                            overviewRulerLanes: 0
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  {cell.type === 'code' && cell.output && (
                    <div style={{ background: '#000', padding: cell.language === 'html' ? 0 : '16px', borderTop: '1px solid rgba(255,255,255,0.05)', fontFamily: "'Fira Code', monospace", fontSize: 13 }}>
                      {renderOutput(cell)}
                    </div>
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0', opacity: 0.5 }}>
                <button onClick={() => addCell(cells.length - 1, 'code')} style={{ background: 'transparent', border: '1px dashed rgba(255,255,255,0.2)', color: '#888', padding: '8px 24px', borderRadius: '20px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={16} /> Add Cell
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
