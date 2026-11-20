import React, { useRef, useState, useEffect } from 'react';
import { File, FileCode, FileSpreadsheet, FileText, Image as ImageIcon, Music, Play, Trash2, Layout, Maximize2 } from 'lucide-react';
import '../index.css';

/**
 * FileCard & Open Canvas Image Component
 * 
 * Capabilities:
 * - Images render as OPEN visual whiteboard elements with natural aspect ratio & scaling.
 * - Non-image documents render as compact, structured Neo-Brutalist file cards.
 * - Real-time smooth dragging in board coordinates projected with zoom & pan.
 * - Corner resizing for open images.
 * - Double-click / tap opens high-resolution preview modal.
 * 
 * Complexity:
 * - Time: O(1) rendering and drag calculations.
 * - Space: O(1) state memory.
 */
export default function FileCard({ 
  card, 
  zoom, 
  scrollX, 
  scrollY, 
  onUpdatePosition, 
  onDoubleClick,
  onDelete,
  canEdit = true
}) {
  const cardRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Resizing state for open images
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, width: 360 });
  const [customWidth, setCustomWidth] = useState(card.width || 360);

  useEffect(() => {
    if (card.width) setCustomWidth(card.width);
  }, [card.width]);

  // Global click handler to deselect when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        setIsSelected(false);
      }
    };
    window.addEventListener('pointerdown', handleClickOutside);
    return () => window.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  const isImage = card.type === 'image' || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes((card.name || '').split('.').pop().toLowerCase());

  const getIcon = () => {
    if (card.type === 'nested-board') return Layout;
    const ext = (card.name || '').split('.').pop().toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return ImageIcon;
    if (['js', 'py', 'html', 'css', 'json', 'cpp'].includes(ext)) return FileCode;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet;
    if (['doc', 'docx', 'txt', 'md'].includes(ext)) return FileText;
    if (['mp3', 'wav'].includes(ext)) return Music;
    if (['mp4', 'webm'].includes(ext)) return Play;
    return File;
  };

  const Icon = getIcon();
  const iconBg = card.type === 'nested-board' ? 'var(--accent-orange)' : 'var(--accent-pink)';

  const handlePointerDown = (e) => {
    // Ignore if clicking resize handle or delete button
    if (e.target.closest('.no-drag-card')) return;
    e.stopPropagation();
    setIsSelected(true);
    if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setStartPos({
      x: e.clientX,
      y: e.clientY
    });
    setDragOffset({ x: 0, y: 0 });
  };

  // Dragging logic
  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!isDragging) return;
      const dx = (e.clientX - startPos.x) / zoom;
      const dy = (e.clientY - startPos.y) / zoom;
      setDragOffset({ x: dx, y: dy });
    };

    const handlePointerUp = () => {
      if (isDragging) {
        setIsDragging(false);
        if (dragOffset.x !== 0 || dragOffset.y !== 0) {
          onUpdatePosition(card.id, card.x + dragOffset.x, card.y + dragOffset.y, customWidth);
        }
        setDragOffset({ x: 0, y: 0 });
      }
    };

    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, startPos, zoom, card.x, card.y, card.id, dragOffset, onUpdatePosition, customWidth]);

  // Image Resizing logic
  useEffect(() => {
    const handleResizeMove = (e) => {
      if (!isResizing) return;
      const delta = (e.clientX - resizeStart.x) / zoom;
      const newWidth = Math.max(180, Math.min(1000, Math.round(resizeStart.width + delta)));
      setCustomWidth(newWidth);
    };

    const handleResizeUp = () => {
      if (isResizing) {
        setIsResizing(false);
        onUpdatePosition(card.id, card.x, card.y, customWidth);
      }
    };

    if (isResizing) {
      window.addEventListener('pointermove', handleResizeMove);
      window.addEventListener('pointerup', handleResizeUp);
    }

    return () => {
      window.removeEventListener('pointermove', handleResizeMove);
      window.removeEventListener('pointerup', handleResizeUp);
    };
  }, [isResizing, resizeStart, zoom, card.id, card.x, card.y, customWidth, onUpdatePosition]);

  // =========================================================================
  // 1. OPEN IMAGE RENDERING (True open picture on whiteboard canvas)
  // =========================================================================
  if (isImage && card.url) {
    return (
      <div
        ref={cardRef}
        onPointerDown={handlePointerDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onDoubleClick(card);
        }}
        className="open-canvas-image"
        style={{
          position: 'absolute',
          left: `${(card.x + dragOffset.x + scrollX) * zoom}px`,
          top: `${(card.y + dragOffset.y + scrollY) * zoom}px`,
          transform: `translate(-50%, -50%) scale(${zoom})`,
          width: `${customWidth}px`,
          background: '#090a0f',
          border: isSelected ? '4px solid var(--accent-yellow, #facc15)' : '3px solid #000',
          boxShadow: isDragging ? 'none' : (isSelected ? '0 0 0 4px rgba(250, 204, 21, 0.4), 6px 6px 0px #000' : '5px 5px 0px #000'),
          borderRadius: '10px',
          cursor: isDragging ? 'grabbing' : (isResizing ? 'ew-resize' : 'grab'),
          pointerEvents: 'all',
          userSelect: 'none',
          zIndex: isSelected ? 55 : 50,
          overflow: 'visible',
          display: 'flex',
          flexDirection: 'column',
          transition: 'border 0.1s, box-shadow 0.1s'
        }}
      >
        {/* Full Open Image */}
        <img
          src={card.url}
          alt={card.name}
          style={{
            width: '100%',
            height: 'auto',
            maxHeight: '600px',
            objectFit: 'contain',
            borderRadius: '7px',
            display: 'block',
            pointerEvents: 'none'
          }}
          loading="lazy"
        />

        {/* Hover / Selection Action Pill */}
        {(isSelected || isHovered) && (
          <div 
            className="no-drag-card"
            style={{
              position: 'absolute',
              bottom: '-32px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#090a0f',
              border: '2px solid #00ffcc',
              color: '#00ffcc',
              padding: '3px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '800',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
              fontFamily: "'Space Grotesk', sans-serif",
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              zIndex: 70
            }}
          >
            <span>{card.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDoubleClick(card);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px'
              }}
              title="Expand Fullscreen"
            >
              <Maximize2 size={12} />
            </button>
          </div>
        )}

        {/* Delete Action Button */}
        {isHovered && onDelete && canEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(card.id);
            }}
            className="no-drag-card"
            style={{
              position: 'absolute',
              top: '-12px',
              right: '-12px',
              background: 'var(--accent-red, #ff4444)',
              color: 'white',
              border: '2px solid #000',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '2px 2px 0px #000',
              zIndex: 100
            }}
            title="Delete Image"
          >
            <Trash2 size={14} strokeWidth={3} />
          </button>
        )}

        {/* Corner Resize Handle */}
        {(isSelected || isHovered) && canEdit && (
          <div
            className="no-drag-card"
            onPointerDown={(e) => {
              e.stopPropagation();
              setIsResizing(true);
              setResizeStart({ x: e.clientX, width: customWidth });
            }}
            style={{
              position: 'absolute',
              bottom: '-6px',
              right: '-6px',
              width: '18px',
              height: '18px',
              background: 'var(--accent-yellow, #facc15)',
              border: '2px solid #000',
              borderRadius: '4px',
              cursor: 'nwse-resize',
              zIndex: 80,
              boxShadow: '1px 1px 0 #000'
            }}
            title="Drag to resize image"
          />
        )}
      </div>
    );
  }

  // =========================================================================
  // 2. DOCUMENT / GENERIC FILE CARD RENDERING (PDF, PPT, Code, Notes, etc.)
  // =========================================================================
  return (
    <div
      ref={cardRef}
      onPointerDown={handlePointerDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick(card);
      }}
      style={{
        position: 'absolute',
        left: `${(card.x + dragOffset.x + scrollX) * zoom}px`,
        top: `${(card.y + dragOffset.y + scrollY) * zoom}px`,
        transform: `translate(-50%, -50%) scale(${zoom})`,
        width: '120px',
        height: '140px',
        background: isSelected ? 'var(--accent-blue, #3b82f6)' : 'var(--surface-color)',
        border: isSelected ? '4px solid #000' : 'var(--border-width) solid var(--border-color)',
        boxShadow: isDragging ? 'none' : (isSelected ? '0 0 0 4px rgba(59,130,246,0.3)' : 'var(--shadow-md)'),
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isDragging ? 'grabbing' : 'grab',
        pointerEvents: 'all',
        userSelect: 'none',
        padding: '12px',
        gap: '12px',
        zIndex: isSelected ? 55 : 50,
        transition: 'background 0.1s, border 0.1s, box-shadow 0.1s'
      }}
    >
      <div style={{
        background: iconBg,
        padding: '12px',
        borderRadius: '8px',
        border: '2px solid #000',
        boxShadow: '2px 2px 0px #000',
      }}>
        <Icon size={32} color="var(--text-main)" />
      </div>
      
      <div style={{
        fontSize: '12px',
        fontWeight: '700',
        color: 'var(--text-main)',
        textAlign: 'center',
        wordBreak: 'break-word',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      }}>
        {card.name}
      </div>

      {/* Quick Open Action Button */}
      {(isSelected || isHovered) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDoubleClick(card);
          }}
          className="neo-btn no-drag-card"
          style={{
            position: 'absolute',
            bottom: '-10px',
            background: 'var(--accent-yellow, #facc15)',
            color: '#000',
            border: '2px solid #000',
            borderRadius: '4px',
            padding: '2px 8px',
            fontSize: '11px',
            fontWeight: '900',
            boxShadow: '2px 2px 0 #000',
            cursor: 'pointer',
            zIndex: 60
          }}
        >
          Open
        </button>
      )}

      {isHovered && onDelete && canEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(card.id);
          }}
          className="no-drag-card"
          style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            background: 'var(--accent-red, #ff4444)',
            color: 'white',
            border: '2px solid var(--border-color)',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '2px 2px 0px var(--shadow-color)',
            zIndex: 100,
          }}
          title="Delete Card"
        >
          <Trash2 size={14} strokeWidth={3} />
        </button>
      )}
    </div>
  );
}
