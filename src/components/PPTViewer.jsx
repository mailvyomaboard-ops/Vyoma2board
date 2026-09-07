import { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Cloud, Loader2 } from 'lucide-react';
import { storage } from '../firebase';
import { ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';

export default function PPTViewer({ fileData, onClose, onToggleFullscreen, isFullscreen = false, onSaveToCloudSuccess }) {
  const containerRef = useRef(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [totalSlides, setTotalSlides] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const slidesRef = useRef([]);
  const slideSizeRef = useRef({ width: 1333, height: 750 });

  const [uploadingToCloud, setUploadingToCloud] = useState(false);

  const handleSaveToCloud = async () => {
    if (!fileData.url) return;
    try {
      setUploadingToCloud(true);
      const filename = fileData.name || 'presentation.pptx';
      const path = `ppts/${Date.now()}_${filename}`;
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

  useEffect(() => {
    const loadPPTX = async () => {
      try {
        setLoading(true);
        const { parse } = await import('pptxtojson');
        const response = await fetch(fileData.url);
        if (!response.ok) throw new Error('Failed to fetch PPTX file');
        const arrayBuffer = await response.arrayBuffer();
        
        // Use slideFactor to scale up for better rendering quality
        const result = await parse(arrayBuffer, { slideFactor: 1.5, fontsizeFactor: 1.5 });
        slidesRef.current = result.slides;
        slideSizeRef.current = result.size || { width: 1333, height: 750 };
        setTotalSlides(result.slides.length);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load PPTX:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadPPTX();
  }, [fileData.url]);

  const renderSlide = async (slideIndex) => {
    if (slidesRef.current.length === 0 || !containerRef.current) return;
    
    try {
      const slide = slidesRef.current[slideIndex];
      if (!slide) return;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const scale = 2;
      const { width, height } = slideSizeRef.current;
      canvas.width = width * scale;
      canvas.height = height * scale;
      ctx.scale(scale, scale);

      // Fill background
      if (slide.fill && slide.fill.type === 'color') {
        ctx.fillStyle = slide.fill.value || '#ffffff';
      } else {
        ctx.fillStyle = '#ffffff';
      }
      ctx.fillRect(0, 0, width, height);

      // Render all elements
      for (const element of slide.elements || []) {
        await renderElement(ctx, element, scale);
      }

      containerRef.current.innerHTML = '';
      
      // Make canvas responsive - scale to fit container while maintaining aspect ratio
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.objectFit = 'contain';
      
      containerRef.current.appendChild(canvas);
    } catch (err) {
      console.error('Failed to render slide:', err);
    }
  };

  const renderElement = async (ctx, element, scale) => {
    const x = element.left || 0;
    const y = element.top || 0;
    const w = element.width || 100;
    const h = element.height || 50;

    // Handle rotation
    if (element.rotate) {
      ctx.save();
      ctx.translate(x + w/2, y + h/2);
      ctx.rotate((element.rotate * Math.PI) / 180);
      ctx.translate(-x - w/2, -y - h/2);
    }

    try {
      switch (element.type) {
        case 'text':
          renderText(ctx, element, x, y, w, h, scale);
          break;
        case 'shape':
          renderShape(ctx, element, x, y, w, h, scale);
          break;
        case 'image':
          await renderImage(ctx, element, x, y, w, h, scale);
          break;
        case 'table':
          renderTable(ctx, element, x, y, w, h, scale);
          break;
        case 'chart':
          renderChart(ctx, element, x, y, w, h, scale);
          break;
        case 'group':
          for (const child of element.elements || []) {
            await renderElement(ctx, child, scale);
          }
          break;
        default:
          // Unknown element type, skip
          break;
      }
    } finally {
      if (element.rotate) {
        ctx.restore();
      }
    }
  };

  const stripHtml = (str) => {
    return (str || '').replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, '');
  };

  const renderText = (ctx, element, x, y, w, h, scale) => {
    // Use element height to estimate font size, fallback to 18pt
    const fontSize = Math.max(12, Math.min(h, 72)) * scale;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = (element.fill && element.fill.type === 'color') ? element.fill.value : '#000000';
    ctx.textBaseline = 'top';
    
    // Strip HTML/XML tags from content
    const cleanContent = stripHtml(element.content || '');
    const lines = cleanContent.split('\n');
    lines.forEach((line, i) => {
      ctx.fillText(line, x, y + i * fontSize * 1.2);
    });
  };

  const renderShape = (ctx, element, x, y, w, h, scale) => {
    if (element.fill) {
      if (element.fill.type === 'color') {
        ctx.fillStyle = element.fill.value || '#cccccc';
      } else if (element.fill.type === 'image' && element.fill.value?.picBase64) {
        // Image fill - skip for now
        ctx.fillStyle = '#cccccc';
      } else {
        ctx.fillStyle = '#cccccc';
      }
    } else {
      ctx.fillStyle = '#cccccc';
    }
    
    if (element.borderWidth && element.borderWidth > 0) {
      ctx.strokeStyle = element.borderColor || '#000000';
      ctx.lineWidth = (element.borderWidth || 1) * scale;
      if (element.borderType === 'dashed') {
        ctx.setLineDash([5, 5]);
      } else if (element.borderType === 'dotted') {
        ctx.setLineDash([2, 2]);
      }
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    }
    ctx.fillRect(x, y, w, h);
  };

  const renderImage = async (ctx, element, x, y, w, h, scale) => {
    if (!element.src && !element.blob) return;
    
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = element.src || `data:image/png;base64,${element.blob}`;
      });
      ctx.drawImage(img, x, y, w, h);
    } catch (e) {
      console.warn('Failed to load image:', e);
      // Draw placeholder
      ctx.fillStyle = '#eeeeee';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#cccccc';
      ctx.strokeRect(x, y, w, h);
    }
  };

  const renderTable = (ctx, element, x, y, w, h, scale) => {
    const rows = element.data || [];
    const rowHeights = element.rowHeights || [];
    const colWidths = element.colWidths || [];
    
    let currentY = y;
    rows.forEach((row, rowIdx) => {
      const rowHeight = (rowHeights[rowIdx] || 20) * scale;
      let currentX = x;
      
      row.forEach((cell, colIdx) => {
        const colWidth = (colWidths[colIdx] || 100) * scale;
        
        // Cell background
        if (cell.fillColor) {
          ctx.fillStyle = cell.fillColor;
          ctx.fillRect(currentX, currentY, colWidth, rowHeight);
        }
        
        // Cell borders
        if (cell.borders) {
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1 * scale;
          
          if (cell.borders.top) {
            ctx.beginPath();
            ctx.moveTo(currentX, currentY);
            ctx.lineTo(currentX + colWidth, currentY);
            ctx.stroke();
          }
          if (cell.borders.bottom) {
            ctx.beginPath();
            ctx.moveTo(currentX, currentY + rowHeight);
            ctx.lineTo(currentX + colWidth, currentY + rowHeight);
            ctx.stroke();
          }
          if (cell.borders.left) {
            ctx.beginPath();
            ctx.moveTo(currentX, currentY);
            ctx.lineTo(currentX, currentY + rowHeight);
            ctx.stroke();
          }
          if (cell.borders.right) {
            ctx.beginPath();
            ctx.moveTo(currentX + colWidth, currentY);
            ctx.lineTo(currentX + colWidth, currentY + rowHeight);
            ctx.stroke();
          }
        }
        
        // Cell text
        if (cell.text) {
          ctx.font = `${12 * scale}px Arial`;
          ctx.fillStyle = cell.fontColor || '#000000';
          ctx.textBaseline = 'middle';
          ctx.fillText(cell.text, currentX + 4 * scale, currentY + rowHeight / 2);
        }
        
        currentX += colWidth;
      });
      
      currentY += rowHeight;
    });
  };

  const renderChart = (ctx, element, x, y, w, h, scale) => {
    // Simple chart placeholder
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#cccccc';
    ctx.strokeRect(x, y, w, h);
    ctx.font = `${14 * scale}px Arial`;
    ctx.fillStyle = '#666666';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Chart: ${element.chartType || 'Unknown'}`, x + w/2, y + h/2);
  };

  useEffect(() => {
    if (!loading && totalSlides > 0) {
      renderSlide(currentSlide);
    }
  }, [currentSlide, loading, totalSlides]);

  const goToSlide = (index) => {
    if (index >= 0 && index < totalSlides) {
      setCurrentSlide(index);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      goToSlide(currentSlide + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      goToSlide(currentSlide - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      goToSlide(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      goToSlide(totalSlides - 1);
    } else if (e.key === 'Escape' && isFullscreen) {
      onToggleFullscreen?.(false);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, totalSlides, isFullscreen]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileData.url;
    link.download = fileData.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%', 
        width: '100%',
        background: '#1a1a2e',
        color: '#e0e0e0'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            border: '4px solid #3b82f6', 
            borderTopColor: 'transparent', 
            borderRadius: '50%', 
            margin: '0 auto 16px',
            animation: 'spin 1s linear infinite'
          }} />
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
          <p>Loading presentation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%', 
        width: '100%',
        background: '#1a1a2e',
        color: '#ef4444',
        padding: '24px',
        textAlign: 'center'
      }}>
        <p>Failed to load presentation: {error}</p>
      </div>
    );
  }

  const handleClose = () => {
    onClose();
  };

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      minHeight: '400px',
      background: '#0a0a0f', 
      display: 'flex', 
      flexDirection: 'column',
      borderRadius: '12px',
      overflow: 'visible'
    }} onKeyDown={handleKeyDown} tabIndex={0}>


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
          ref={containerRef}
        >
          {totalSlides === 0 && (
            <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>
              <p>No slides found in this presentation</p>
            </div>
          )}
        </div>

      {totalSlides > 1 && (
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
            onClick={() => goToSlide(0)}
            disabled={currentSlide === 0}
            style={{ 
              background: 'rgba(255,255,255,0.1)', 
              border: 'none', 
              color: currentSlide === 0 ? '#666' : '#e0e0e0', 
              cursor: currentSlide === 0 ? 'not-allowed' : 'pointer', 
              padding: '8px', 
              borderRadius: '8px', 
              display: 'flex',
              transition: 'background 0.2s'
            }}
            title="First Slide"
          >
            <ChevronLeft size={18} />
            <ChevronLeft size={18} />
          </button>
          
          <button 
            onClick={() => goToSlide(currentSlide - 1)}
            disabled={currentSlide === 0}
            style={{ 
              background: 'rgba(255,255,255,0.1)', 
              border: 'none', 
              color: currentSlide === 0 ? '#666' : '#e0e0e0', 
              cursor: currentSlide === 0 ? 'not-allowed' : 'pointer', 
              padding: '8px', 
              borderRadius: '8px', 
              display: 'flex',
              transition: 'background 0.2s'
            }}
            title="Previous Slide (←)"
          >
            <ChevronLeft size={22} />
          </button>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            minWidth: '200px',
            justifyContent: 'center'
          }}>
            {Array.from({ length: Math.min(totalSlides, 10) }, (_, i) => {
              const slideNum = totalSlides > 10 
                ? Math.max(0, Math.min(totalSlides - 10, currentSlide - 4)) + i
                : i;
              if (slideNum >= totalSlides) return null;
              return (
                <button
                  key={slideNum}
                  onClick={() => goToSlide(slideNum)}
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    border: 'none',
                    background: slideNum === currentSlide ? '#3b82f6' : 'rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  title={`Slide ${slideNum + 1}`}
                />
              );
            })}
          </div>
          
          <button 
            onClick={() => goToSlide(currentSlide + 1)}
            disabled={currentSlide === totalSlides - 1}
            style={{ 
              background: 'rgba(255,255,255,0.1)', 
              border: 'none', 
              color: currentSlide === totalSlides - 1 ? '#666' : '#e0e0e0', 
              cursor: currentSlide === totalSlides - 1 ? 'not-allowed' : 'pointer', 
              padding: '8px', 
              borderRadius: '8px', 
              display: 'flex',
              transition: 'background 0.2s'
            }}
            title="Next Slide (→)"
          >
            <ChevronRight size={22} />
          </button>
          
          <button 
            onClick={() => goToSlide(totalSlides - 1)}
            disabled={currentSlide === totalSlides - 1}
            style={{ 
              background: 'rgba(255,255,255,0.1)', 
              border: 'none', 
              color: currentSlide === totalSlides - 1 ? '#666' : '#e0e0e0', 
              cursor: currentSlide === totalSlides - 1 ? 'not-allowed' : 'pointer', 
              padding: '8px', 
              borderRadius: '8px', 
              display: 'flex',
              transition: 'background 0.2s'
            }}
            title="Last Slide"
          >
            <ChevronRight size={18} />
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}