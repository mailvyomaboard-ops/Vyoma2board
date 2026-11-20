import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Undo, Redo, Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, List, ListOrdered, ChevronDown, Highlighter
} from 'lucide-react';
import '../index.css';

export default function DocumentIDE({
  fileData,
  initialHtml,
  onClose,
  onChange,
  isEditing = true
}) {
  const [zoom, setZoom] = useState(100);
  const editorRef = useRef(null);

  // Focus at the end of the content on load if editing
  useEffect(() => {
    if (editorRef.current && isEditing) {
      editorRef.current.focus();
    }
  }, [isEditing]);

  const handleApplyFormat = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      if (onChange) onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div 
      style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#09090b', color: '#e0e0e0', userSelect: 'none', fontFamily: 'Inter, sans-serif', pointerEvents: 'all' }}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <style>{`
        .document-editor-content {
          outline: none;
          min-height: 100%;
          padding: 40px 60px;
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          line-height: 1.6;
          color: #e0e0e0;
          transition: all 0.2s;
        }
        .document-editor-content p {
          margin-bottom: 1em;
        }
        .document-editor-content h1, .document-editor-content h2, .document-editor-content h3 {
          color: #00ffcc;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          font-weight: 600;
          text-shadow: 0 0 10px rgba(0, 255, 204, 0.2);
        }
        .document-editor-content ul, .document-editor-content ol {
          margin-left: 20px;
          margin-bottom: 1em;
        }
        .document-editor-content li {
          margin-bottom: 0.5em;
        }
        .document-editor-content a {
          color: #00ffcc;
          text-decoration: underline;
        }
        .document-editor-content img {
          max-width: 100%;
          border-radius: 8px;
          border: 1px solid rgba(0, 255, 204, 0.3);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
          margin: 1em 0;
        }
        .document-editor-content table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
        }
        .document-editor-content th, .document-editor-content td {
          border: 1px solid rgba(0, 255, 204, 0.2);
          padding: 8px 12px;
          background: rgba(0,0,0,0.4);
        }
        .document-editor-content th {
          background: rgba(0, 255, 204, 0.1);
          color: #00ffcc;
        }
        .document-paper {
          background: #0f0f12;
          width: 100%;
          max-width: 900px;
          margin: 40px auto;
          min-height: 1100px;
          box-shadow: 0 0 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,255,204,0.1);
          position: relative;
        }
      `}</style>
      
      {/* Top Header */}
      <div style={{ height: '60px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#e0e0e0', fontWeight: '500', fontSize: '15px' }}>
          <FileText size={20} color="#00ffcc" />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px', color: '#00ffcc', textShadow: '0 0 10px rgba(0,255,204,0.3)' }}>
            {fileData?.name || 'Document'}
          </span>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(0, 255, 204, 0.1)', border: '1px solid rgba(0, 255, 204, 0.2)', color: '#00ffcc', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', transition: 'all 0.2s' }}>
          Close File
        </button>
      </div>

      {/* Formatting Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 24px', background: 'rgba(24, 24, 27, 0.6)', backdropFilter: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: 24, zIndex: 9, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <Undo size={18} style={{ cursor: 'pointer', color: '#a1a1aa' }} onClick={() => handleApplyFormat('undo')} />
          <Redo size={18} style={{ cursor: 'pointer', color: '#a1a1aa' }} onClick={() => handleApplyFormat('redo')} />
        </div>
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />
        <span style={{cursor:'pointer', color: '#a1a1aa', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4}} onClick={() => setZoom(z => z === 100 ? 150 : z === 150 ? 50 : 100)}>
          {zoom}% <ChevronDown size={14} />
        </span>
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ display: 'flex', gap: 12, color: '#a1a1aa' }}>
          <Bold size={18} style={{ cursor: 'pointer' }} onClick={() => handleApplyFormat('bold')} />
          <Italic size={18} style={{ cursor: 'pointer' }} onClick={() => handleApplyFormat('italic')} />
          <Underline size={18} style={{ cursor: 'pointer' }} onClick={() => handleApplyFormat('underline')} />
          <Strikethrough size={18} style={{ cursor: 'pointer' }} onClick={() => handleApplyFormat('strikeThrough')} />
        </div>
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ display: 'flex', gap: 12, color: '#a1a1aa' }}>
          <AlignLeft size={18} style={{ cursor: 'pointer' }} onClick={() => handleApplyFormat('justifyLeft')} />
          <AlignCenter size={18} style={{ cursor: 'pointer' }} onClick={() => handleApplyFormat('justifyCenter')} />
          <AlignRight size={18} style={{ cursor: 'pointer' }} onClick={() => handleApplyFormat('justifyRight')} />
        </div>
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ display: 'flex', gap: 12, color: '#a1a1aa' }}>
          <List size={18} style={{ cursor: 'pointer' }} onClick={() => handleApplyFormat('insertUnorderedList')} />
          <ListOrdered size={18} style={{ cursor: 'pointer' }} onClick={() => handleApplyFormat('insertOrderedList')} />
        </div>
      </div>

      {/* Editor Canvas */}
      <div style={{ flex: 1, overflow: 'auto', background: '#050505', display: 'flex', justifyContent: 'center' }}>
        <div style={{ 
          transform: 'scale(' + (zoom / 100) + ')', 
          transformOrigin: 'top center',
          width: '100%',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <div className="document-paper">
            <div 
              ref={editorRef}
              className="document-editor-content"
              contentEditable={isEditing}
              suppressContentEditableWarning
              onInput={handleInput}
              dangerouslySetInnerHTML={{ __html: initialHtml || '<p><br></p>' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
