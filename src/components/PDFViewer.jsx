import { useState, useRef, useEffect } from 'react';
import { pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { storage } from '../firebase';
import { ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export default function PDFViewer({ fileData, onClose, onToggleFullscreen, isFullscreen = false, onSaveToCloudSuccess }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadingToCloud, setUploadingToCloud] = useState(false);
  const containerRef = useRef(null);
  
  const isPublicUrl = fileData.url && fileData.url.startsWith('http') && !fileData.url.includes('localhost');

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (err) => {
    console.error("Failed to load PDF:", err);
    setError(err.message);
    setLoading(false);
  };

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

  const goToPage = (index) => {
    if (index >= 1 && index <= numPages) {
      setPageNumber(index);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      goToPage(pageNumber + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      goToPage(pageNumber - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      goToPage(1);
    } else if (e.key === 'End' && numPages) {
      e.preventDefault();
      goToPage(numPages);
    } else if (e.key === 'Escape' && isFullscreen) {
      onToggleFullscreen?.(false);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pageNumber, numPages, isFullscreen]);

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
        overflow: 'visible'
      }} 
      onKeyDown={handleKeyDown} 
      tabIndex={0}
      ref={containerRef}
    >

      <div 
        style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          overflow: 'visible',
          background: '#0d0d14',
          position: 'relative',
          minHeight: 0,
        }}
      >
        <Document
          file={fileData.url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div style={{ color: '#888', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Loader2 size={24} className="spin" /> Loading PDF...
            </div>
          }
        >
          {numPages && (
            <Page 
              pageNumber={pageNumber} 
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="pdf-page-wrapper"
              width={containerRef.current ? Math.min(containerRef.current.clientWidth - 40, 1200) : undefined}
            />
          )}
        </Document>

        {error && (
          <div style={{ color: '#ef4444', padding: '24px', textAlign: 'center' }}>
            <p>Failed to load PDF: {error}</p>
          </div>
        )}
      </div>

      {(!isFullscreen || true) && numPages > 1 && (
        <div style={{ 
          height: '72px', 
          background: isFullscreen ? 'transparent' : 'rgba(10, 10, 15, 0.95)', 
          position: isFullscreen ? 'absolute' : 'sticky',
          bottom: isFullscreen ? '20px' : '0',
          left: isFullscreen ? '50%' : 'auto',
          transform: isFullscreen ? 'translateX(-50%)' : 'none',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '16px', 
          padding: '0 20px', 
          borderTop: isFullscreen ? 'none' : '1px solid rgba(255,255,255,0.1)',
          borderRadius: isFullscreen ? '20px' : '0',
          flexShrink: 0,
          backdropFilter: 'none',
          zIndex: 10,
          pointerEvents: 'auto'
        }}>
          <button 
            onClick={() => goToPage(1)}
            disabled={pageNumber === 1}
            style={{ 
              background: 'rgba(255,255,255,0.1)', 
              border: 'none', 
              color: pageNumber === 1 ? '#666' : '#e0e0e0', 
              cursor: pageNumber === 1 ? 'not-allowed' : 'pointer', 
              padding: '8px', 
              borderRadius: '8px', 
              display: 'flex',
              transition: 'background 0.2s',
              backdropFilter: 'none'
            }}
            title="First Page"
          >
            <ChevronLeft size={18} />
            <ChevronLeft size={18} />
          </button>
          
          <button 
            onClick={() => goToPage(pageNumber - 1)}
            disabled={pageNumber === 1}
            style={{ 
              background: 'rgba(255,255,255,0.1)', 
              border: 'none', 
              color: pageNumber === 1 ? '#666' : '#e0e0e0', 
              cursor: pageNumber === 1 ? 'not-allowed' : 'pointer', 
              padding: '8px', 
              borderRadius: '8px', 
              display: 'flex',
              transition: 'background 0.2s',
              backdropFilter: 'none'
            }}
            title="Previous Page (←)"
          >
            <ChevronLeft size={22} />
          </button>
          
          <div style={{ color: '#e0e0e0', fontSize: '14px', background: isFullscreen ? 'rgba(0,0,0,0.5)' : 'transparent', padding: isFullscreen ? '6px 12px' : '0', borderRadius: '20px' }}>
            {pageNumber} / {numPages}
          </div>
          
          <button 
            onClick={() => goToPage(pageNumber + 1)}
            disabled={pageNumber === numPages}
            style={{ 
              background: 'rgba(255,255,255,0.1)', 
              border: 'none', 
              color: pageNumber === numPages ? '#666' : '#e0e0e0', 
              cursor: pageNumber === numPages ? 'not-allowed' : 'pointer', 
              padding: '8px', 
              borderRadius: '8px', 
              display: 'flex',
              transition: 'background 0.2s',
              backdropFilter: 'none'
            }}
            title="Next Page (→)"
          >
            <ChevronRight size={22} />
          </button>
          
          <button 
            onClick={() => goToPage(numPages)}
            disabled={pageNumber === numPages}
            style={{ 
              background: 'rgba(255,255,255,0.1)', 
              border: 'none', 
              color: pageNumber === numPages ? '#666' : '#e0e0e0', 
              cursor: pageNumber === numPages ? 'not-allowed' : 'pointer', 
              padding: '8px', 
              borderRadius: '8px', 
              display: 'flex',
              transition: 'background 0.2s',
              backdropFilter: 'none'
            }}
            title="Last Page"
          >
            <ChevronRight size={18} />
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
