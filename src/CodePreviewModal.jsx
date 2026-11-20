import React, { useState, useEffect, useCallback } from 'react';
import { X, Download, Code, Loader2 } from 'lucide-react';

const overlayStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100000, position: 'fixed', inset: 0 };
const contentStyle = { width: '80%', maxWidth: '900px', height: '80vh', background: '#1e1e1e', borderRadius: '8px', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', overflow: 'hidden', marginTop: '10vh' };
const headerStyle = { height: '50px', background: '#2d2d2d', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid #444' };
const titleContainerStyle = { display: 'flex', alignItems: 'center', gap: '12px', color: '#e0e0e0', fontWeight: '500', fontSize: '14px' };
const buttonContainerStyle = { display: 'flex', gap: '12px' };
const downloadButtonStyle = { background: 'transparent', border: '1px solid #555', color: '#e0e0e0', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' };
const closeButtonStyle = { background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', display: 'flex', alignItems: 'center' };
const bodyStyle = { flex: 1, overflow: 'auto', padding: '20px', position: 'relative' };
const loadingStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888' };
const errorStyle = { color: '#ff6b6b', textAlign: 'center', marginTop: '40px' };
const preStyle = { margin: 0, color: '#d4d4d4', fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-all' };

export default function CodePreviewModal({ fileData, onClose }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchContent = async () => {
      try {
        setLoading(true);
        if (!fileData?.url) throw new Error('No URL provided');
        if (fileData.url.startsWith('javascript:')) throw new Error('Invalid URL protocol');

        const response = await fetch(fileData.url);
        if (!response.ok) throw new Error('Failed to fetch file content');
        
        const text = await response.text();
        if (text.length > 500000) throw new Error('File is too large to preview');
        if (isMounted) setContent(text);
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchContent();
    return () => { isMounted = false; };
  }, [fileData?.url]);

  const handleDownload = useCallback(() => {
    if (!fileData?.url) return;
    const link = document.createElement('a');
    link.href = fileData.url;
    link.download = fileData.name || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [fileData]);

  const stopPropagation = useCallback((e) => {
    e.stopPropagation();
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose} style={overlayStyle}>
      <div 
        className="modal-content" 
        style={contentStyle}
        onClick={stopPropagation}
      >
        <div style={headerStyle}>
          <div style={titleContainerStyle}>
            <Code size={18} color="#4ade80" />
            {fileData?.name || 'Code Preview'}
          </div>
          <div style={buttonContainerStyle}>
            <button onClick={handleDownload} style={downloadButtonStyle}>
              <Download size={14} /> Download
            </button>
            <button onClick={onClose} style={closeButtonStyle}>
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div style={bodyStyle}>
          {loading && (
            <div style={loadingStyle}>
              <Loader2 size={32} className="spin" />
            </div>
          )}
          
          {error && (
            <div style={errorStyle}>
              Error loading preview: {error}
            </div>
          )}
          
          {!loading && !error && (
            <pre style={preStyle}>
              <code>{content}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
