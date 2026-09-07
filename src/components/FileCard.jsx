import React, { useRef, useState, useEffect } from 'react';
import { File, FileCode, FileSpreadsheet, FileText, Image as ImageIcon, Music, Play, Folder, Trash2 } from 'lucide-react';
import '../index.css';

export default function FileCard({ 
  card, 
  zoom, 
  scrollX, 
  scrollY, 
  onUpdatePosition, 
  onDoubleClick,
  onDelete
}) {
  const cardRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const getIcon = () => {
    if (card.type === 'nested-board') return Folder;
    const ext = card.name.split('.').pop().toLowerCase();
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

  const handlePointerDown = (e) => {
    e.stopPropagation();
    setIsDragging(true);
    setStartPos({
      x: e.clientX,
      y: e.clientY
    });
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!isDragging) return;
      
      const dx = (e.clientX - startPos.x) / zoom;
      const dy = (e.clientY - startPos.y) / zoom;

      onUpdatePosition(card.id, card.x + dx, card.y + dy);

      setStartPos({ x: e.clientX, y: e.clientY });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
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
        // Center the card on its x/y coordinate for easier math
        left: `calc(50% + ${(card.x + scrollX) * zoom}px)`,
        top: `calc(50% + ${(card.y + scrollY) * zoom}px)`,
        transform: `translate(-50%, -50%) scale(${zoom})`,
        width: '120px',
        height: '140px',
        background: 'var(--surface-color)',
        border: 'var(--border-width) solid var(--border-color)',
        boxShadow: isDragging ? 'none' : 'var(--shadow-md)',
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
        zIndex: 50, // Above canvas, below toolbars
      }}
    >
      <div style={{
        background: iconBg,
        padding: '12px',
        borderRadius: '8px',
        border: '2px solid var(--border-color)',
        boxShadow: '2px 2px 0px var(--shadow-color)',
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

      {isHovered && onDelete && (
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
