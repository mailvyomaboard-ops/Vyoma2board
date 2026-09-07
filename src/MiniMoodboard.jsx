import React, { useEffect, useState, useCallback } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { Download, X, FileText, Loader2 } from 'lucide-react';

export default function MiniMoodboard({ fileData, onClose }) {
  const [status, setStatus] = useState('processing');
  const [pages, setPages] = useState([]);
  
  // Polling for processing status
  useEffect(() => {
    let intervalId;
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/files/${fileData.id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        
        if (data.success && data.file.status === 'completed') {
          setStatus('completed');
          setPages(data.pages);
          clearInterval(intervalId);
        }
      } catch (err) {
        console.error("Polling error", err);
      }
    };

    checkStatus();
    intervalId = setInterval(checkStatus, 1000);
    return () => clearInterval(intervalId);
  }, [fileData.id]);

  const handleDownload = () => {
    if (fileData.url) {
      const link = document.createElement('a');
      link.href = fileData.url;
      link.download = fileData.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-header">
        <div className="modal-title">
          <FileText size={20} color="#666" />
          {fileData.name} - Mini Vyomaboard
          {status === 'processing' && (
            <span className="processing-badge">
              <Loader2 size={12} className="spin" /> Processing...
            </span>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={handleDownload}>
            <Download size={16} /> Download Source File
          </button>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '8px' }}>
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="modal-body" style={{ position: 'relative' }}>
        {status === 'processing' && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', 
            justifyContent: 'center', background: 'rgba(255,255,255,0.8)', zIndex: 10
          }}>
             <Loader2 size={48} className="spin" color="#666" />
             <h2 style={{marginTop: 20, color: '#333'}}>Extracting Document Pages...</h2>
             <p style={{color: '#666'}}>Please wait while we process {fileData.name}</p>
          </div>
        )}
        
        {/* The drawing canvas layer (Transparent background so we can see the images behind it) */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
          <Tldraw 
            persistenceKey={`tldraw-${fileData.id}`} 
            components={{ Background: () => null }} 
          />
        </div>

        {/* The images layer (Safely placed behind the canvas, cannot crash tldraw) */}
        {status === 'completed' && pages.length > 0 && (
           <div style={{
             position: 'absolute',
             top: 20, left: '50%', transform: 'translateX(-50%)',
             display: 'flex', flexDirection: 'column', gap: '40px',
             zIndex: 1, // Behind the canvas which is zIndex: 10
           }}>
              {pages.map((page) => (
                <img 
                  key={page.pageNum} 
                  src={page.url} 
                  alt={`Page ${page.pageNum}`} 
                  style={{ width: '800px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid #ddd', background: 'white' }} 
                />
              ))}
           </div>
        )}
      </div>
    </div>
  );
}
