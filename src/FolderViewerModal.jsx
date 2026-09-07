import React, { useState, useEffect } from 'react';
import { X, Folder, FileCode, FileText, Plus, Save } from 'lucide-react';

import FileViewerModal from './FileViewerModal';

export default function FolderViewerModal({ folderId, initialName, initialFiles, onClose }) {
  
  const [files, setFiles] = useState(initialFiles || []);
  const [activeFile, setActiveFile] = useState(null);

  // Sync files to store whenever they change
  const syncFiles = (newFiles) => {
    setFiles(newFiles);
    // editor.updateShape({
    //   id: folderId,
    //   type: 'milanote-folder',
    //   props: { files: newFiles }
    // });
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
           url: activeFile.url,
           content: activeFile.content, // Pass content directly
           isCloudFile: activeFile.isCloudFile || false, // Flag to indicate it doesn't need to fetch from backend
           fileId: activeFile.id
        }}
        folderFiles={files} // Pass all files in folder so the compiler can link them
        onClose={() => setActiveFile(null)}
        onOpenFile={(f) => setActiveFile(f)}
        onSaveCloudFile={(newContent) => handleSaveFileContent(activeFile.id, newContent)}
        onCreateCloudFile={(name) => {
           const newFile = {
             id: Date.now().toString(),
             name: name,
             content: ''
           };
           syncFiles([...files, newFile]);
        }}
      />
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      fontFamily: 'Inter, sans-serif'
    }}>
      <div 
        onClick={(e) => { e.stopPropagation(); if (e.nativeEvent?.stopImmediatePropagation) e.nativeEvent.stopImmediatePropagation(); }}
        onKeyDown={(e) => { e.stopPropagation(); if (e.nativeEvent?.stopImmediatePropagation) e.nativeEvent.stopImmediatePropagation(); }}
        onKeyUp={(e) => { e.stopPropagation(); if (e.nativeEvent?.stopImmediatePropagation) e.nativeEvent.stopImmediatePropagation(); }}
        onPointerDown={(e) => { e.stopPropagation(); if (e.nativeEvent?.stopImmediatePropagation) e.nativeEvent.stopImmediatePropagation(); }}
        onPointerMove={(e) => { e.stopPropagation(); if (e.nativeEvent?.stopImmediatePropagation) e.nativeEvent.stopImmediatePropagation(); }}
        onPointerUp={(e) => { e.stopPropagation(); if (e.nativeEvent?.stopImmediatePropagation) e.nativeEvent.stopImmediatePropagation(); }}
        onWheel={(e) => { e.stopPropagation(); if (e.nativeEvent?.stopImmediatePropagation) e.nativeEvent.stopImmediatePropagation(); }}
        style={{
        background: '#1a1e36',
        color: 'var(--surface-color)',
        width: '800px',
        maxWidth: '90vw',
        height: '600px',
        maxHeight: '90vh',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          background: 'rgba(255,255,255,0.05)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Folder size={24} color="#f59e0b" />
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{initialName}</h2>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div style={{ padding: '16px 24px', display: 'flex', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <button 
            onClick={handleCreateFile}
            style={{
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Plus size={16} />
            New Notebook
          </button>
        </div>

        {/* File Grid */}
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '16px', alignContent: 'flex-start' }}>
          {files.length === 0 ? (
            <div style={{ width: '100%', textAlign: 'center', color: '#666', marginTop: '60px' }}>
              <Folder size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
              <p>This folder is empty.</p>
            </div>
          ) : (
            files.map(f => (
              <div 
                key={f.id}
                onDoubleClick={() => handleOpenFile(f)}
                className="folder-file-btn"
                style={{
                  width: '120px',
                  padding: '16px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.05)',
                  transition: 'background 0.2s'
                }}
              >
                {f.name.endsWith('.c') || f.name.endsWith('.h') ? (
                   <FileCode size={40} color="#3b82f6" />
                ) : (
                   <FileText size={40} color="#6b7280" />
                )}
                <span style={{ fontSize: '13px', textAlign: 'center', wordBreak: 'break-word', color: '#ddd' }}>
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
