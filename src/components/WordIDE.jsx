import { useState } from 'react';

import DOMPurify from 'dompurify';

export default function WordIDE({
  fileData,
  content,
  onClose,
  isEditing = true,
  setEditContent,
  onScrollUpdate
}) {
  const [zoomLevel, setZoomLevel] = useState(100);

  const handleExecCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    if (setEditContent) {
      const editor = document.getElementById('word-editor-canvas');
      if (editor) setEditContent(editor.innerHTML);
    }
  };

  const handleInput = (e) => {
    if (setEditContent) setEditContent(e.target.innerHTML);
  };

  const insertImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          handleExecCommand('insertImage', e.target.result);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const insertTable = () => {
    const html = `
      <table style="width: 100%; border-collapse: collapse; margin: 1em 0;">
        <tbody>
          <tr><td style="border: 1px solid rgba(0,255,204,0.3); padding: 8px;">Cell 1</td><td style="border: 1px solid rgba(0,255,204,0.3); padding: 8px;">Cell 2</td></tr>
          <tr><td style="border: 1px solid rgba(0,255,204,0.3); padding: 8px;">Cell 3</td><td style="border: 1px solid rgba(0,255,204,0.3); padding: 8px;">Cell 4</td></tr>
        </tbody>
      </table><p><br></p>
    `;
    handleExecCommand('insertHTML', html);
  };

  return (
    <div 
      style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#09090b', color: '#e0e0e0', userSelect: 'none', fontFamily: 'Inter, sans-serif', pointerEvents: 'all' }}
      onPointerDown={(e) => isEditing && e.stopPropagation()}
      onKeyDown={(e) => isEditing && e.stopPropagation()}
      onWheel={(e) => isEditing && e.stopPropagation()}
    >
      <style>{`
        #word-editor-canvas {
          outline: none;
          min-height: 100%;
        }
        #word-editor-canvas p { margin-bottom: 1em; }
        #word-editor-canvas h1, #word-editor-canvas h2, #word-editor-canvas h3 {
          color: #00ffcc; margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 600; text-shadow: 0 0 10px rgba(0, 255, 204, 0.2);
        }
        #word-editor-canvas ul, #word-editor-canvas ol { margin-left: 20px; margin-bottom: 1em; }
        #word-editor-canvas li { margin-bottom: 0.5em; }
        #word-editor-canvas a { color: #00ffcc; text-decoration: underline; }
        #word-editor-canvas img { max-width: 100%; border-radius: 8px; border: 1px solid rgba(0, 255, 204, 0.3); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5); margin: 1em 0; }
        #word-editor-canvas table td, #word-editor-canvas table th { background: rgba(0,0,0,0.4); }
      `}</style>
      
      {/* Formatting Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'transparent', zIndex: 9 }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 24px', background: 'rgba(24, 24, 27, 0.8)', backdropFilter: 'none', border: '1px solid rgba(0,255,204,0.2)', borderRadius: '8px', gap: 20, flexWrap: 'wrap', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
          <div style={{ display: 'flex', gap: 12, color: '#a1a1aa' }}>
            <Undo size={18} style={{ cursor: 'pointer', transition: 'color 0.15s' }} onMouseDown={e => { e.preventDefault(); handleExecCommand('undo'); }} onMouseEnter={e => e.currentTarget.style.color = '#00ffcc'} onMouseLeave={e => e.currentTarget.style.color = '#a1a1aa'} />
            <Redo size={18} style={{ cursor: 'pointer', transition: 'color 0.15s' }} onMouseDown={e => { e.preventDefault(); handleExecCommand('redo'); }} onMouseEnter={e => e.currentTarget.style.color = '#00ffcc'} onMouseLeave={e => e.currentTarget.style.color = '#a1a1aa'} />
          </div>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#a1a1aa', fontSize: 13 }}>
            <button onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))} style={{ border: 'none', background: 'transparent', color: '#a1a1aa', cursor: 'pointer' }}>-</button>
            <span style={{ minWidth: 32, textAlign: 'center' }}>{zoomLevel}%</span>
            <button onClick={() => setZoomLevel(prev => Math.min(200, prev + 10))} style={{ border: 'none', background: 'transparent', color: '#a1a1aa', cursor: 'pointer' }}>+</button>
          </div>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />
          <select onChange={(e) => handleExecCommand('formatBlock', e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: 13, color: '#a1a1aa', outline: 'none', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
            <option value="P" style={{background: '#09090b'}}>Normal text</option>
            <option value="H1" style={{background: '#09090b'}}>Heading 1</option>
            <option value="H2" style={{background: '#09090b'}}>Heading 2</option>
            <option value="H3" style={{background: '#09090b'}}>Heading 3</option>
          </select>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', gap: 12, color: '#a1a1aa' }}>
            <Bold size={18} style={{ cursor: 'pointer', transition: 'color 0.15s' }} onMouseDown={e => { e.preventDefault(); handleExecCommand('bold'); }} onMouseEnter={e => e.currentTarget.style.color = '#00ffcc'} onMouseLeave={e => e.currentTarget.style.color = '#a1a1aa'} />
            <Italic size={18} style={{ cursor: 'pointer', transition: 'color 0.15s' }} onMouseDown={e => { e.preventDefault(); handleExecCommand('italic'); }} onMouseEnter={e => e.currentTarget.style.color = '#00ffcc'} onMouseLeave={e => e.currentTarget.style.color = '#a1a1aa'} />
            <Underline size={18} style={{ cursor: 'pointer', transition: 'color 0.15s' }} onMouseDown={e => { e.preventDefault(); handleExecCommand('underline'); }} onMouseEnter={e => e.currentTarget.style.color = '#00ffcc'} onMouseLeave={e => e.currentTarget.style.color = '#a1a1aa'} />
            <Strikethrough size={18} style={{ cursor: 'pointer', transition: 'color 0.15s' }} onMouseDown={e => { e.preventDefault(); handleExecCommand('strikeThrough'); }} onMouseEnter={e => e.currentTarget.style.color = '#00ffcc'} onMouseLeave={e => e.currentTarget.style.color = '#a1a1aa'} />
          </div>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', gap: 12, color: '#a1a1aa' }}>
            <AlignLeft size={18} style={{ cursor: 'pointer', transition: 'color 0.15s' }} onMouseDown={e => { e.preventDefault(); handleExecCommand('justifyLeft'); }} onMouseEnter={e => e.currentTarget.style.color = '#00ffcc'} onMouseLeave={e => e.currentTarget.style.color = '#a1a1aa'} />
            <AlignCenter size={18} style={{ cursor: 'pointer', transition: 'color 0.15s' }} onMouseDown={e => { e.preventDefault(); handleExecCommand('justifyCenter'); }} onMouseEnter={e => e.currentTarget.style.color = '#00ffcc'} onMouseLeave={e => e.currentTarget.style.color = '#a1a1aa'} />
            <AlignRight size={18} style={{ cursor: 'pointer', transition: 'color 0.15s' }} onMouseDown={e => { e.preventDefault(); handleExecCommand('justifyRight'); }} onMouseEnter={e => e.currentTarget.style.color = '#00ffcc'} onMouseLeave={e => e.currentTarget.style.color = '#a1a1aa'} />
            <AlignJustify size={18} style={{ cursor: 'pointer', transition: 'color 0.15s' }} onMouseDown={e => { e.preventDefault(); handleExecCommand('justifyFull'); }} onMouseEnter={e => e.currentTarget.style.color = '#00ffcc'} onMouseLeave={e => e.currentTarget.style.color = '#a1a1aa'} />
          </div>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', gap: 12, color: '#a1a1aa' }}>
            <List size={18} style={{ cursor: 'pointer', transition: 'color 0.15s' }} onMouseDown={e => { e.preventDefault(); handleExecCommand('insertUnorderedList'); }} onMouseEnter={e => e.currentTarget.style.color = '#00ffcc'} onMouseLeave={e => e.currentTarget.style.color = '#a1a1aa'} />
            <ListOrdered size={18} style={{ cursor: 'pointer', transition: 'color 0.15s' }} onMouseDown={e => { e.preventDefault(); handleExecCommand('insertOrderedList'); }} onMouseEnter={e => e.currentTarget.style.color = '#00ffcc'} onMouseLeave={e => e.currentTarget.style.color = '#a1a1aa'} />
          </div>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', gap: 12, color: '#a1a1aa' }}>
            <ImageIcon size={18} style={{ cursor: 'pointer', transition: 'color 0.15s' }} onMouseDown={e => { e.preventDefault(); insertImage(); }} onMouseEnter={e => e.currentTarget.style.color = '#00ffcc'} onMouseLeave={e => e.currentTarget.style.color = '#a1a1aa'} />
            <Table size={18} style={{ cursor: 'pointer', transition: 'color 0.15s' }} onMouseDown={e => { e.preventDefault(); insertTable(); }} onMouseEnter={e => e.currentTarget.style.color = '#00ffcc'} onMouseLeave={e => e.currentTarget.style.color = '#a1a1aa'} />
            <Highlighter size={18} style={{ cursor: 'pointer', transition: 'color 0.15s' }} onMouseDown={e => { e.preventDefault(); handleExecCommand('hiliteColor', '#00ffcc'); }} onMouseEnter={e => e.currentTarget.style.color = '#00ffcc'} onMouseLeave={e => e.currentTarget.style.color = '#a1a1aa'} />
          </div>
        </div>
      </div>

      {/* Editor Canvas Container */}
      <div 
        style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', paddingBottom: '100px', background: '#050505' }}
        onScroll={(e) => {
          if (onScrollUpdate) {
            onScrollUpdate({ left: e.target.scrollLeft, top: e.target.scrollTop });
          }
        }}
      >
        <div 
          style={{ 
            width: '816px', // Standard 8.5x11 aspect ratio width
            minHeight: '1056px',
            background: '#0f0f12', 
            border: '1px solid rgba(0,255,204,0.1)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 20px rgba(0,255,204,0.05)',
            transform: `scale(${zoomLevel / 100})`, 
            transformOrigin: 'top center',
            margin: '20px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div 
            id="word-editor-canvas"
            contentEditable={isEditing}
            suppressContentEditableWarning
            onInput={handleInput}
            style={{ 
              flex: 1, 
              padding: '64px',
              outline: 'none',
              cursor: 'text',
              userSelect: 'text',
              color: '#e0e0e0',
              fontSize: '15px',
              lineHeight: '1.6',
              fontFamily: 'Inter, sans-serif',
              caretColor: '#00ffcc' // Neon cyan text cursor!
            }}
            dangerouslySetInnerHTML={{ __html: content ? DOMPurify.sanitize(content) : '<p><br></p>' }}
          />
        </div>
      </div>
    </div>
  );
}
