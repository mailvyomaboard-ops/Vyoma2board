import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Plus, Trash2, ChevronUp, ChevronDown, Code, Type, Loader2, Upload, X, Eraser, FileText, Eye } from 'lucide-react';
import DOMPurify from 'dompurify';
import { getApiUrl } from '../config';
import { runCode } from '../lib/codeExecution';

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
      const allFiles = [
        ...folderFiles.map(f => ({ name: f.name, content: f.content })),
        ...uploadedFiles.map(f => ({ name: f.name, content: f.content })),
      ];

      const res = await runCode({
        code: cell.content || '',
        language: cell.language || 'python',
        files: allFiles,
      });

      setCells(prev => {
        const newCells = prev.map(c => c.id === cell.id ? { ...c, output: res.output } : c);
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
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#090a0f', color: '#f0f6fc', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <style>{`
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .cyber-btn:hover { filter: brightness(1.15); transform: translateY(-1px); }
        .cyber-btn:active { transform: translateY(0); }
      `}</style>

      {/* Top Cyberpunk Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: 'rgba(14, 16, 24, 0.95)', borderBottom: '1px solid rgba(0, 255, 204, 0.15)', zIndex: 10 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={handleRunAll} className="cyber-btn" style={{ background: '#00ffcc', color: '#090a0f', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s ease', boxShadow: '0 0 10px rgba(0, 255, 204, 0.25)' }}>
            <Play size={14} fill="#090a0f" /> Run All
          </button>
          <button onClick={() => addCell(-1, 'code')} className="cyber-btn" style={{ background: 'rgba(0, 255, 204, 0.08)', color: '#00ffcc', border: '1px solid rgba(0, 255, 204, 0.4)', padding: '6px 14px', borderRadius: '6px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s ease' }}>
            <Code size={14} /> + Code
          </button>
          <button onClick={() => addCell(-1, 'markdown')} className="cyber-btn" style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#e0e0e0', border: '1px solid rgba(255, 255, 255, 0.15)', padding: '6px 14px', borderRadius: '6px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s ease' }}>
            <Type size={14} /> + Text
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={handleClearAllOutputs} className="cyber-btn" style={{ background: 'transparent', color: '#ff5555', border: '1px solid rgba(255, 85, 85, 0.3)', padding: '6px 12px', borderRadius: '6px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s ease' }}>
            <Eraser size={13} /> Clear Outputs
          </button>
          <button onClick={() => setShowFiles(!showFiles)} className="cyber-btn" style={{ background: showFiles ? 'rgba(0, 255, 204, 0.12)' : 'rgba(255, 255, 255, 0.04)', color: showFiles ? '#00ffcc' : '#c9d1d9', border: showFiles ? '1px solid rgba(0, 255, 204, 0.5)' : '1px solid rgba(255, 255, 255, 0.12)', padding: '6px 12px', borderRadius: '6px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s ease' }}>
            <FileText size={13} /> Files & Explorer ({folderFiles.length + uploadedFiles.length})
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {showFiles && (
          <div style={{ width: 280, background: '#0d0f17', borderRight: '1px solid rgba(0, 255, 204, 0.12)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <button onClick={() => setActiveTab('explorer')} style={{ flex: 1, padding: '10px', background: activeTab === 'explorer' ? 'rgba(0, 255, 204, 0.1)' : 'transparent', border: 'none', borderBottom: activeTab === 'explorer' ? '2px solid #00ffcc' : '2px solid transparent', color: activeTab === 'explorer' ? '#00ffcc' : '#8b949e', cursor: 'pointer', fontWeight: 600, fontSize: 12, transition: 'all 0.15s ease' }}>
                Workspace ({folderFiles.length})
              </button>
              <button onClick={() => setActiveTab('uploads')} style={{ flex: 1, padding: '10px', background: activeTab === 'uploads' ? 'rgba(0, 255, 204, 0.1)' : 'transparent', border: 'none', borderBottom: activeTab === 'uploads' ? '2px solid #00ffcc' : '2px solid transparent', color: activeTab === 'uploads' ? '#00ffcc' : '#8b949e', cursor: 'pointer', fontWeight: 600, fontSize: 12, transition: 'all 0.15s ease' }}>
                Uploads ({uploadedFiles.length})
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
              {activeTab === 'explorer' ? (
                <div>
                  <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Workspace Files</div>
                  {folderFiles.map(f => (
                    <div 
                      key={f.id} 
                      onClick={() => { if (onOpenFile) onOpenFile(f); }}
                      style={{ padding: '8px 10px', background: (fileData?.fileId === f.id || fileData?.originShapeId === f.id) ? 'rgba(0, 255, 204, 0.12)' : 'rgba(255, 255, 255, 0.03)', border: (fileData?.fileId === f.id || fileData?.originShapeId === f.id) ? '1px solid rgba(0, 255, 204, 0.3)' : '1px solid transparent', borderRadius: '4px', marginBottom: 6, fontSize: 12, cursor: 'pointer', color: (fileData?.fileId === f.id || fileData?.originShapeId === f.id) ? '#00ffcc' : '#c9d1d9', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s ease' }}
                    >
                      <FileText size={12} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    </div>
                  ))}
                  {folderFiles.length === 0 && <div style={{ fontSize: 12, color: '#6e7681', textAlign: 'center', marginTop: 24 }}>No files in workspace.</div>}
                </div>
              ) : (
                <div>
                  {uploadedFiles.map(f => (
                    <div key={f.id} style={{ padding: '8px 10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '4px', marginBottom: 6, fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180, color: '#c9d1d9' }}>{f.name}</span>
                      <button onClick={() => setUploadedFiles(prev => prev.filter(x => x.id !== f.id))} style={{ background: 'transparent', border: 'none', color: '#ff5555', cursor: 'pointer', padding: 2 }}><X size={13} /></button>
                    </div>
                  ))}
                  {uploadedFiles.length === 0 && (
                    <div style={{ fontSize: 12, color: '#6e7681', textAlign: 'center', marginTop: 24, lineHeight: 1.5 }}>
                      No session files attached.<br/>Upload auxiliary files to import them in code.
                    </div>
                  )}
                  <div style={{ marginTop: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 14px', background: '#00ffcc', color: '#090a0f', borderRadius: '6px', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.15s ease' }}>
                      <Upload size={14} /> Upload File
                      <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div id="notebook-scroll-container" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <div style={{ maxWidth: '920px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {cells.map((cell, index) => (
              <div key={cell.id} style={{ background: '#11131c', borderRadius: '8px', border: '1px solid rgba(0, 255, 204, 0.12)', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)', overflow: 'hidden' }}>
                {/* Cell Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ fontSize: 12, color: '#8b949e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {cell.type === 'code' ? <Code size={13} color="#00ffcc" /> : <Type size={13} color="#ff007f" />}
                    {cell.type === 'code' ? (
                      <select 
                        value={cell.language || 'python'} 
                        onChange={(e) => updateCellLanguage(index, e.target.value)}
                        style={{ background: '#181b26', color: '#f0f6fc', border: '1px solid rgba(0, 255, 204, 0.25)', borderRadius: '4px', padding: '2px 8px', fontSize: 11, outline: 'none' }}
                      >
                        <option value="python">Python</option>
                        <option value="javascript">JavaScript / Node</option>
                        <option value="c">C</option>
                        <option value="cpp">C++</option>
                        <option value="java">Java</option>
                        <option value="go">Go</option>
                        <option value="rust">Rust</option>
                        <option value="csharp">C#</option>
                        <option value="html">HTML Preview</option>
                      </select>
                    ) : (
                      <span style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Markdown Text</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button onClick={() => updateCellContent(index, '')} title="Clear cell content" style={{ background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}><Eraser size={13} /></button>
                    <button onClick={() => removeCell(index)} title="Delete cell" style={{ background: 'transparent', border: 'none', color: '#ff5555', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}><Trash2 size={13} /></button>
                  </div>
                </div>

                {/* Cell Editor & Play Gutter */}
                <div style={{ display: 'flex', position: 'relative' }}>
                  {cell.type === 'code' && (
                    <div style={{ width: 44, display: 'flex', justifyContent: 'center', background: '#0b0c13', borderRight: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <div style={{ position: 'sticky', top: 10, marginTop: 10 }}>
                        <button 
                          onClick={() => handleRunCell(cell, index)}
                          title="Execute cell"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '4px', border: '1px solid rgba(0, 255, 204, 0.3)', background: runningCellId === cell.id ? 'rgba(0, 255, 204, 0.15)' : 'rgba(0, 255, 204, 0.05)', color: '#00ffcc', cursor: 'pointer', transition: 'all 0.15s ease' }}
                        >
                          {runningCellId === cell.id ? <Loader2 size={14} className="spin" /> : <Play size={12} fill="#00ffcc" style={{ marginLeft: 1 }} />}
                        </button>
                      </div>
                    </div>
                  )}
                  <div style={{ flex: 1, padding: '10px', minWidth: 0 }}>
                    <div style={{ height: 250, minHeight: 180, resize: 'vertical', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '4px', background: '#141622' }}>
                      <Editor
                        height="100%"
                        language={cell.type === 'code' ? (cell.language || 'python') : 'markdown'}
                        value={cell.content}
                        onChange={(val) => updateCellContent(index, val)}
                        theme="vs-dark"
                        onMount={handleEditorMount}
                        options={{ 
                          minimap: { enabled: false }, 
                          fontSize: 13,
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

                {/* Output Terminal Area */}
                {cell.type === 'code' && cell.output && (
                  <div style={{ background: '#06070a', padding: cell.language === 'html' ? 0 : '14px 16px', borderTop: '1px solid rgba(0, 255, 204, 0.15)', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 12, lineHeight: 1.6, color: '#f0f6fc', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {renderOutput(cell)}
                  </div>
                )}
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
              <button onClick={() => addCell(cells.length - 1, 'code')} className="cyber-btn" style={{ background: 'transparent', border: '1px dashed rgba(0, 255, 204, 0.3)', color: '#00ffcc', padding: '8px 22px', borderRadius: '6px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s ease' }}>
                <Plus size={14} /> Add Cell
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
