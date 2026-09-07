import React, { useState, useEffect } from 'react';
import { X, Grid, FileCode, FileText, Plus, Save } from 'lucide-react';
import FileViewerModal from './FileViewerModal';

export default function BoardViewerModal({ boardId, initialName, initialFiles, onClose }) {
  const [files, setFiles] = useState(initialFiles || []);
  const [activeFile, setActiveFile] = useState(null);

  const syncFiles = (newFiles) => {
    setFiles(newFiles);
  };

  const handleCreateFile = () => {
    let filename = prompt('Enter new Notebook name (extension not required):');
    if (!filename) return;

    filename = filename.trim();
    if (!filename.endsWith('.ipynb')) {
      filename += '.ipynb';
    }

    const newFile = {
      id: Date.now().toString(),
      name: filename,
      content: ''
    };

    syncFiles([...files, newFile]);
  };

  const handleOpenFile = (f) => {
    // Open in FileViewerModal (we'll modify it to accept an in-memory file)
    setActiveFile(f);
  };

  const handleSaveFileContent = (fileId, newContent) => {
    const updated = files.map(f => f.id === fileId ? { ...f, content: newContent } : f);
    syncFiles(updated);
  };

  if (activeFile) {
    return (
      <FileViewerModal 
        fileData={{
           name: activeFile.name,
           content: activeFile.content, // Pass content directly
           isCloudFile: true, // Flag to indicate it doesn't need to fetch from backend
           fileId: activeFile.id
        }}
        folderFiles={files} // Pass all files in folder so the compiler can link them
        onClose={() => setActiveFile(null)}
        onOpenFile={(f) => setActiveFile(f)}
        onSaveCloudFile={(newContent) => handleSaveFileContent(activeFile.id, newContent)}
      />
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      fontFamily: "'Inter', sans-serif"
    }}>
      <div 
        className="neo-window" 
        onClick={(e) => { e.stopPropagation(); if (e.nativeEvent?.stopImmediatePropagation) e.nativeEvent.stopImmediatePropagation(); }}
        onKeyDown={(e) => { e.stopPropagation(); if (e.nativeEvent?.stopImmediatePropagation) e.nativeEvent.stopImmediatePropagation(); }}
        onKeyUp={(e) => { e.stopPropagation(); if (e.nativeEvent?.stopImmediatePropagation) e.nativeEvent.stopImmediatePropagation(); }}
        onPointerDown={(e) => { e.stopPropagation(); if (e.nativeEvent?.stopImmediatePropagation) e.nativeEvent.stopImmediatePropagation(); }}
        onPointerMove={(e) => { e.stopPropagation(); if (e.nativeEvent?.stopImmediatePropagation) e.nativeEvent.stopImmediatePropagation(); }}
        onPointerUp={(e) => { e.stopPropagation(); if (e.nativeEvent?.stopImmediatePropagation) e.nativeEvent.stopImmediatePropagation(); }}
        onWheel={(e) => { e.stopPropagation(); if (e.nativeEvent?.stopImmediatePropagation) e.nativeEvent.stopImmediatePropagation(); }}
        style={{
        width: '800px',
        maxWidth: '90vw',
        height: '600px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div className="neo-window-header" style={{
          padding: '16px 24px',
          background: 'var(--accent-purple)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Grid size={28} />
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-main)' }}>{initialName}</h2>
          </div>
          <button 
            className="neo-btn"
            onClick={onClose}
            style={{
              background: 'var(--bg-color)',
              padding: '4px',
              display: 'flex'
            }}
          >
            <X size={24} strokeWidth={3} />
          </button>
        </div>

        {/* Toolbar */}
        <div style={{ padding: '16px 24px', display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)' }}>
          <button 
            className="neo-btn"
            onClick={handleCreateFile}
            style={{
              background: 'var(--accent-green)',
              padding: '8px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textTransform: 'uppercase'
            }}
          >
            <Plus size={20} strokeWidth={3} />
            New Notebook
          </button>
        </div>

        {/* File Grid */}
        <div className="neo-window-content" style={{ padding: '32px', flex: 1, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '24px', alignContent: 'flex-start' }}>
          {files.length === 0 ? (
            <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-main)', marginTop: '60px' }}>
              <Grid size={64} style={{ opacity: 0.2, marginBottom: '16px' }} />
              <p style={{ fontWeight: 800, fontSize: '20px', textTransform: 'uppercase' }}>This board is empty.</p>
            </div>
          ) : (
            files.map(f => (
              <div 
                key={f.id}
                onDoubleClick={() => handleOpenFile(f)}
                className="folder-file-btn"
                style={{
                  width: '140px',
                  padding: '24px 16px',
                  background: 'var(--surface-color)',
                  borderRadius: '0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                  cursor: 'pointer',
                  border: '4px solid #000',
                  boxShadow: '6px 6px 0px #000',
                  transition: 'transform 0.1s, box-shadow 0.1s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translate(-2px, -2px)';
                  e.currentTarget.style.boxShadow = '8px 8px 0px #000';
                  e.currentTarget.style.background = '#fef08a';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '6px 6px 0px #000';
                  e.currentTarget.style.background = 'var(--surface-color)';
                }}
              >
                {f.name.endsWith('.c') || f.name.endsWith('.h') || f.name.endsWith('.cpp') || f.name.endsWith('.js') || f.name.endsWith('.py') ? (
                   <FileCode size={48} color="#3b82f6" />
                ) : (
                   <FileText size={48} color="#6b7280" />
                )}
                <span style={{ fontSize: '14px', textAlign: 'center', wordBreak: 'break-word', color: '#000', fontWeight: 800 }}>
                  {f.name}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
