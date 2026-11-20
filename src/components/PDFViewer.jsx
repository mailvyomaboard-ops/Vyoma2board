import React from 'react';
import { Cloud, Loader2 } from 'lucide-react';
import { storage } from '../firebase';
import { ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
import { useState } from 'react';

export default function PDFViewer({ fileData, onClose, onToggleFullscreen, isFullscreen = false, onSaveToCloudSuccess }) {
  const [uploadingToCloud, setUploadingToCloud] = useState(false);

  if (!fileData) return null;

  const handleSaveToCloud = async () => {
    if (!fileData.url) return;
    try {
      setUploadingToCloud(true);
      const filename = fileData.name || 'document.pdf';
      const path = `pdfs/${Date.now()}_${filename}`;
      const storageRef = ref(storage, path);
      
      if (fileData.url.startsWith('data:')) {
        await uploadString(storageRef, fileData.url, 'data_url');
      } else {
        const res = await fetch(fileData.url);
        const blob = await res.blob();
        await uploadBytes(storageRef, blob);
      }
      
      const publicUrl = await getDownloadURL(storageRef);
      fileData.url = publicUrl;
      if (onSaveToCloudSuccess) {
        onSaveToCloudSuccess(publicUrl);
      }
    } catch (err) {
      console.error("Failed to upload to cloud:", err);
      alert("Failed to upload to cloud: " + err.message);
    } finally {
      setUploadingToCloud(false);
    }
  };

  const isPublicUrl = fileData.url && fileData.url.startsWith('http') && !fileData.url.includes('localhost');

  return (
    <div 
      style={{ 
        width: '100%', 
        height: '100%', 
        minHeight: '400px',
        background: '#0a0a0f', 
        display: 'flex', 
        flexDirection: 'column',
        borderRadius: isFullscreen ? '0' : '12px',
        overflow: 'hidden'
      }} 
    >
      {/* Cloud Backup Toolbar */}
      {(!isPublicUrl || uploadingToCloud) && (
        <div style={{ 
          background: '#1a1a2e', 
          padding: '12px 24px', 
          display: 'flex', 
          justifyContent: 'flex-end',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)' 
        }}>
          {!isPublicUrl && (
            <button
              onClick={handleSaveToCloud}
              disabled={uploadingToCloud}
              className="neo-btn"
              style={{
                background: 'var(--accent-blue)',
                padding: '8px 16px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {uploadingToCloud ? <Loader2 size={16} className="spin" /> : <Cloud size={16} />}
              {uploadingToCloud ? 'Saving to Cloud...' : 'Backup to Cloud'}
            </button>
          )}
        </div>
      )}

      {/* Native PDF Viewer */}
      <div style={{ flex: 1, position: 'relative' }}>
        <object
          data={fileData.url}
          type="application/pdf"
          style={{ width: '100%', height: '100%', border: 'none' }}
        >
          <iframe
            src={fileData.url}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="PDF Viewer"
          >
            <div style={{ color: '#ef4444', padding: '24px', textAlign: 'center' }}>
              <p>Your browser does not support inline PDFs.</p>
              <a href={fileData.url} target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>
                Download PDF
              </a>
            </div>
          </iframe>
        </object>
      </div>
    </div>
  );
}
