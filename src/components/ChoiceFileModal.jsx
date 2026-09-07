import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { getApiUrl } from '../config';
import '../index.css';

export default function ChoiceFileModal({ onClose, onFileSelect, onFileUpload }) {
  const apiUrl = getApiUrl();
  const [selectedRecent, setSelectedRecent] = useState([]);
  const [recentFiles, setRecentFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentFiles = async () => {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) {
        setLoading(false);
        return;
      }
      try {
        const q = query(
          collection(db, 'users', userEmail, 'recentFiles'),
          orderBy('timestamp', 'desc'),
          limit(10)
        );
        const querySnapshot = await getDocs(q);
        const files = [];
        querySnapshot.forEach((doc) => {
          files.push({ id: doc.id, ...doc.data() });
        });
        setRecentFiles(files);
      } catch (err) {
        console.error("Error fetching recent files", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecentFiles();
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadFiles(e.target.files);
    }
  };

  const uploadFiles = async (files) => {
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const token = localStorage.getItem('token') || '';
        const response = await fetch(`${apiUrl}/api/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        const data = await response.json();
        if (data.success) {
          // Notify parent that file was uploaded
          onFileUpload?.([{ url: data.url, name: data.name, size: data.size, fileId: data.fileId }]);
        }
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }
  };

  const toggleRecent = (id) => {
    if (selectedRecent.includes(id)) {
      setSelectedRecent(selectedRecent.filter(rid => rid !== id));
    } else {
      setSelectedRecent([...selectedRecent, id]);
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case 'json': return <FileJson size={24} color="#F59E0B" />;
      case 'html': return <FileType2 size={24} color="#EF4444" />;
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx': return <FileCode2 size={24} color="#FBBF24" />;
      default: return <FileCode2 size={24} color="#6B7280" />;
    }
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', zIndex: 999999 }}>
      <div style={{
        background: 'var(--surface-color)',
        borderRadius: '16px',
        width: '450px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        fontFamily: 'Inter, sans-serif'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #E5E7EB' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: '#111827' }}>Choice File</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Drag & Drop Area */}
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            style={{
              border: '2px dashed #E5E7EB',
              borderRadius: '12px',
              padding: '32px 24px',
              textAlign: 'center',
              backgroundColor: '#F9FAFB',
              cursor: 'pointer',
              marginBottom: '24px'
            }}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.multiple = true;
              input.onchange = handleFileSelect;
              input.click();
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <UploadCloud size={48} color="#6366F1" />
            </div>
            <p style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#374151', fontWeight: '500' }}>Drag and Drop file</p>
            <button style={{
              background: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: '6px',
              padding: '6px 16px', fontSize: '13px', fontWeight: '500', color: '#4B5563', cursor: 'pointer'
            }}>Browse</button>
          </div>

          {/* Recent Files */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
              Recent Files
              <button 
                onClick={() => {
                  if (selectedRecent.length > 0) {
                    const filesToSelect = recentFiles.filter(f => selectedRecent.includes(f.id));
                    onFileSelect(filesToSelect);
                  }
                }}
                disabled={selectedRecent.length === 0}
                style={{
                  background: selectedRecent.length > 0 ? '#6366F1' : '#E5E7EB',
                  color: selectedRecent.length > 0 ? 'white' : '#9CA3AF',
                  border: 'none', borderRadius: '4px', padding: '4px 12px', fontSize: '12px',
                  cursor: selectedRecent.length > 0 ? 'pointer' : 'not-allowed',
                  fontWeight: '500'
                }}
              >
                Insert Selected
              </button>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {loading ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>Loading recent files...</div>
              ) : recentFiles.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>No recent files found.</div>
              ) : (
                recentFiles.map(file => (
                  <div 
                    key={file.id}
                    onClick={() => toggleRecent(file.id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', borderRadius: '8px', border: '1px solid #E5E7EB',
                      cursor: 'pointer', background: selectedRecent.includes(file.id) ? '#F3F4F6' : 'white',
                      transition: 'background 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {getIconForType(file.type)}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                        <div style={{ fontSize: '12px', color: '#6B7280' }}>{file.size}</div>
                      </div>
                    </div>
                    <div>
                      <input 
                        type="checkbox" 
                        checked={selectedRecent.includes(file.id)}
                        onChange={() => {}}
                        style={{ width: '18px', height: '18px', accentColor: '#6366F1', cursor: 'pointer' }} 
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
