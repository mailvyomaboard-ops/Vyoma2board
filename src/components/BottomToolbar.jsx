import React, { useState, useEffect, useRef } from 'react';
import { 
  MousePointer2, 
  Hand, 
  PenTool, 
  Highlighter, 
  Zap, 
  Eraser, 
  Square, 
  Circle, 
  Diamond, 
  Triangle, 
  ArrowRight, 
  Minus, 
  Type, 
  UploadCloud, 
  FilePlus, 
  LayoutDashboard, 
  Plus, 
  X 
} from 'lucide-react';
import { isMobileDevice } from '../lib/deviceDetection';
import '../index.css';

const DRAW_SUBTOOLS = [
  { id: 'freedraw', icon: PenTool, label: 'Pencil' },
  { id: 'highlighter', icon: Highlighter, label: 'Highlighter' },
  { id: 'laser', icon: Zap, label: 'Laser' },
  { id: 'eraser', icon: Eraser, label: 'Eraser' },
];

const SHAPE_SUBTOOLS = [
  { id: 'rectangle', icon: Square, label: 'Rectangle' },
  { id: 'ellipse', icon: Circle, label: 'Ellipse' },
  { id: 'diamond', icon: Diamond, label: 'Diamond' },
  { id: 'triangle', icon: Triangle, label: 'Triangle' },
  { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
  { id: 'line', icon: Minus, label: 'Line' },
];

const ADD_SUBTOOLS = [
  { id: 'upload', icon: UploadCloud, label: 'Upload File' },
  { id: 'create', icon: FilePlus, label: 'New File' },
  { id: 'nested', icon: LayoutDashboard, label: 'Nested Board' },
];

/**
 * Mobile-First Dual Layout Whiteboard Command Dock
 * Automatically switches between desktop command dock and mobile thumb-optimized strip
 * with expandable sub-drawers for zero feature cutoffs.
 */
const BottomToolbar = React.memo(function BottomToolbar({ 
  activeTool, 
  onToolSelect, 
  viewModeEnabled, 
  perms 
}) {
  const [hoveredTool, setHoveredTool] = useState(null);
  const [activeSubMenu, setActiveSubMenu] = useState(null); // 'draw' | 'shape' | 'add' | null
  const [isMobile, setIsMobile] = useState(false);
  const toolbarRef = useRef(null);

  useEffect(() => {
    setIsMobile(isMobileDevice() || window.innerWidth <= 768);
    const handleResize = () => {
      setIsMobile(isMobileDevice() || window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sub-menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target)) {
        setActiveSubMenu(null);
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, []);

  const isShapeActive = ['shape', 'rectangle', 'ellipse', 'diamond', 'triangle', 'arrow', 'line'].includes(activeTool);
  const isDrawActive = ['freedraw', 'highlighter', 'eraser', 'laser'].includes(activeTool);
  const isAddActive = ['upload', 'create', 'nested'].includes(activeTool);

  const handleToolClick = (toolId, category = null) => {
    if (category) {
      if (activeSubMenu === category) {
        setActiveSubMenu(null);
      } else {
        setActiveSubMenu(category);
      }
    } else {
      setActiveSubMenu(null);
      onToolSelect(toolId);
    }
  };

  const handleSubToolSelect = (subToolId) => {
    onToolSelect(subToolId);
    setActiveSubMenu(null);
  };

  return (
    <div 
      ref={toolbarRef}
      style={{
        position: 'absolute',
        bottom: 'max(16px, env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'all'
      }}
    >
      {/* Expandable Sub-Tool Strip (Pops up above dock on tap) */}
      {activeSubMenu && (
        <div
          className="neo-brutalist-panel"
          style={{
            marginBottom: '8px',
            background: 'var(--surface-color)',
            border: '3px solid #000',
            boxShadow: '4px 4px 0 #000',
            borderRadius: '8px',
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'chatBubblePop 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            maxWidth: 'calc(100vw - 24px)',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {activeSubMenu === 'draw' && DRAW_SUBTOOLS.map(item => {
            const Icon = item.icon;
            const isSubActive = activeTool === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSubToolSelect(item.id)}
                title={item.label}
                style={{
                  background: isSubActive ? 'var(--accent-yellow)' : 'var(--surface-color)',
                  color: '#000',
                  border: '2px solid #000',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <Icon size={16} /> {item.label}
              </button>
            );
          })}

          {activeSubMenu === 'shape' && SHAPE_SUBTOOLS.map(item => {
            const Icon = item.icon;
            const isSubActive = activeTool === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSubToolSelect(item.id)}
                title={item.label}
                style={{
                  background: isSubActive ? 'var(--accent-blue)' : 'var(--surface-color)',
                  color: isSubActive ? '#fff' : '#000',
                  border: '2px solid #000',
                  borderRadius: '4px',
                  padding: '6px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <Icon size={16} /> {item.label}
              </button>
            );
          })}

          {activeSubMenu === 'add' && ADD_SUBTOOLS.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleSubToolSelect(item.id)}
                title={item.label}
                style={{
                  background: 'var(--accent-purple)',
                  color: '#fff',
                  border: '2px solid #000',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <Icon size={16} /> {item.label}
              </button>
            );
          })}

          <button
            onClick={() => setActiveSubMenu(null)}
            style={{
              background: '#fff',
              border: '2px solid #000',
              borderRadius: '4px',
              padding: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0
            }}
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Primary Tool Dock */}
      <div 
        className="neo-brutalist-panel bottom-toolbar-panel" 
        style={{
          display: 'flex',
          gap: isMobile ? '6px' : '8px',
          background: 'var(--surface-color)',
          padding: '6px 10px',
          borderRadius: '8px',
          border: 'var(--border-width) solid var(--border-color)',
          boxShadow: 'var(--shadow-md)',
          maxWidth: 'calc(100vw - 20px)',
          alignItems: 'center'
        }}
      >
        {/* 1. Selection Tool */}
        <button
          title="Select"
          onClick={() => handleToolClick('selection')}
          style={{
            background: activeTool === 'selection' ? 'var(--text-main)' : 'var(--surface-color)',
            color: activeTool === 'selection' ? 'var(--surface-color)' : 'var(--text-main)',
            border: '2px solid var(--border-color)',
            borderRadius: '4px',
            width: isMobile ? '38px' : '40px',
            height: isMobile ? '38px' : '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: activeTool === 'selection' ? 'none' : '2px 2px 0px var(--shadow-color)',
            transform: activeTool === 'selection' ? 'translate(2px, 2px)' : 'none'
          }}
        >
          <MousePointer2 size={18} strokeWidth={activeTool === 'selection' ? 2.5 : 2} />
        </button>

        {/* 2. Hand / Pan Tool */}
        <button
          title="Pan Hand"
          onClick={() => handleToolClick('hand')}
          style={{
            background: activeTool === 'hand' ? 'var(--text-main)' : 'var(--surface-color)',
            color: activeTool === 'hand' ? 'var(--surface-color)' : 'var(--text-main)',
            border: '2px solid var(--border-color)',
            borderRadius: '4px',
            width: isMobile ? '38px' : '40px',
            height: isMobile ? '38px' : '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: activeTool === 'hand' ? 'none' : '2px 2px 0px var(--shadow-color)',
            transform: activeTool === 'hand' ? 'translate(2px, 2px)' : 'none'
          }}
        >
          <Hand size={18} strokeWidth={activeTool === 'hand' ? 2.5 : 2} />
        </button>

        {/* 3. Draw Tools (Pen / Highlighter / Laser / Eraser) */}
        {!viewModeEnabled && (
          <button
            title="Draw Tools"
            onClick={() => handleToolClick('freedraw', isMobile ? 'draw' : null)}
            style={{
              background: isDrawActive ? 'var(--accent-yellow)' : 'var(--surface-color)',
              color: '#000',
              border: '2px solid var(--border-color)',
              borderRadius: '4px',
              width: isMobile ? '38px' : '40px',
              height: isMobile ? '38px' : '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              boxShadow: isDrawActive ? 'none' : '2px 2px 0px var(--shadow-color)',
              transform: isDrawActive ? 'translate(2px, 2px)' : 'none'
            }}
          >
            <PenTool size={18} strokeWidth={isDrawActive ? 2.5 : 2} />
            {isMobile && isDrawActive && (
              <span style={{ position: 'absolute', top: '2px', right: '2px', width: '6px', height: '6px', borderRadius: '50%', background: '#ff007f' }} />
            )}
          </button>
        )}

        {/* 4. Shape Tools (Rect / Circle / Diamond / Arrow / Line) */}
        {!viewModeEnabled && (
          <button
            title="Shapes"
            onClick={() => handleToolClick('rectangle', isMobile ? 'shape' : null)}
            style={{
              background: isShapeActive ? 'var(--accent-blue)' : 'var(--surface-color)',
              color: isShapeActive ? '#fff' : 'var(--text-main)',
              border: '2px solid var(--border-color)',
              borderRadius: '4px',
              width: isMobile ? '38px' : '40px',
              height: isMobile ? '38px' : '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              boxShadow: isShapeActive ? 'none' : '2px 2px 0px var(--shadow-color)',
              transform: isShapeActive ? 'translate(2px, 2px)' : 'none'
            }}
          >
            <Square size={18} strokeWidth={isShapeActive ? 2.5 : 2} />
            {isMobile && isShapeActive && (
              <span style={{ position: 'absolute', top: '2px', right: '2px', width: '6px', height: '6px', borderRadius: '50%', background: '#ff007f' }} />
            )}
          </button>
        )}

        {/* 5. Text Tool */}
        {!viewModeEnabled && (
          <button
            title="Text"
            onClick={() => handleToolClick('text')}
            style={{
              background: activeTool === 'text' ? 'var(--text-main)' : 'var(--surface-color)',
              color: activeTool === 'text' ? 'var(--surface-color)' : 'var(--text-main)',
              border: '2px solid var(--border-color)',
              borderRadius: '4px',
              width: isMobile ? '38px' : '40px',
              height: isMobile ? '38px' : '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: activeTool === 'text' ? 'none' : '2px 2px 0px var(--shadow-color)',
              transform: activeTool === 'text' ? 'translate(2px, 2px)' : 'none'
            }}
          >
            <Type size={18} strokeWidth={activeTool === 'text' ? 2.5 : 2} />
          </button>
        )}

        {/* 6. Add Tool (Upload / New File / Nested Board) */}
        {(!perms || perms.files !== false) && (
          <button
            title="Add Files & Boards"
            onClick={() => handleToolClick('upload', isMobile ? 'add' : null)}
            style={{
              background: isAddActive ? 'var(--accent-purple)' : 'var(--surface-color)',
              color: isAddActive ? '#fff' : 'var(--text-main)',
              border: '2px solid var(--border-color)',
              borderRadius: '4px',
              width: isMobile ? '38px' : '40px',
              height: isMobile ? '38px' : '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: isAddActive ? 'none' : '2px 2px 0px var(--shadow-color)',
              transform: isAddActive ? 'translate(2px, 2px)' : 'none'
            }}
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
});

export default BottomToolbar;
