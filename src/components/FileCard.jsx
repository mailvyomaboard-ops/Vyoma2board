import React, { useRef, useState, useEffect } from 'react';
import { File, FileCode, FileSpreadsheet, FileText, Image as ImageIcon, Music, Play, Folder, Trash2, Layout } from 'lucide-react';
import '../index.css';

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

  const getIcon = () => {
    if (card.type === 'nested-board') return Layout;
    const ext = (card.name || '').split('.').pop().toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return ImageIcon;
    if (['js', 'py', 'html', 'css', 'json', 'cpp'].includes(ext)) return FileCode;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet;
    if (['doc', 'docx', 'txt', 'md'].includes(ext)) return FileText;
    if (['mp3', 'wav'].includes(ext)) return Music;
    if (['mp4', 'webm'].includes(ext)) return Play;
    return File;
  };

  const Icon = getIcon();
  const iconBg = card.type === 'nested-board' ? 'var(--accent-orange)' : 'var(--accent-pink)';

  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handlePointerDown = (e) => {
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

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!isDragging) return;
      
      const dx = (e.clientX - startPos.x) / zoom;
      const dy = (e.clientY - startPos.y) / zoom;
      setDragOffset({ x: dx, y: dy });
    };

    const handlePointerUp = (e) => {
      if (isDragging) {
        setIsDragging(false);
        const dx = (e.clientX - startPos.x) / zoom;
        const dy = (e.clientY - startPos.y) / zoom;
        if (dx !== 0 || dy !== 0) {
          onUpdatePosition(card.id, card.x + dx, card.y + dy);
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
  }, [isDragging, startPos, zoom, card.x, card.y, card.id, onUpdatePosition]);

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
        zIndex: isSelected ? 55 : 50, // Pop above other cards when selected
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

      {isHovered && onDelete && canEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(card.id);
          }}
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
