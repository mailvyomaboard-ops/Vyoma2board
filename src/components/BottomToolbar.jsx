import React, { useState } from 'react';
import { 
  MousePointer2, 
  Hand, 
  PenTool, 
  Square, 
  Type, 
  Phone, 
  UploadCloud, 
  FilePlus, 
  LayoutDashboard 
} from 'lucide-react';
import '../index.css';

const TOOLBAR_ITEMS = [
  { id: 'selection', icon: MousePointer2, label: 'Select' },
  { id: 'hand', icon: Hand, label: 'Hand' },
  { id: 'freedraw', icon: PenTool, label: 'Pen' },
  { id: 'shape', icon: Square, label: 'Shape' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'upload', icon: UploadCloud, label: 'Upload File' },
  { id: 'create', icon: FilePlus, label: 'Create File' },
  { id: 'nested', icon: LayoutDashboard, label: 'Nested Board' }
];

/**
 * @param {{
 *   activeTool: string,
 *   onToolSelect: (tool: string) => void,
 *   onMenuToggle?: any,
 *   openMenu?: any,
 *   canUndo?: boolean,
 *   canRedo?: boolean,
 *   onUndo?: () => void,
 *   onRedo?: () => void
 *   viewModeEnabled?: boolean,
 *   perms?: any
 * }} props
 */
const BottomToolbar = React.memo(function BottomToolbar({ activeTool, onToolSelect, viewModeEnabled, perms }) {
  const [hoveredTool, setHoveredTool] = useState(null);

  const visibleItems = TOOLBAR_ITEMS.filter(item => {
    // If files permission is explicitly denied, hide file-related tools
    if (perms && perms.files === false) {
      if (['upload', 'create', 'nested'].includes(item.id)) return false;
    }
    // If viewMode is enabled (host locked), hide drawing tools
    if (viewModeEnabled) {
      return ['selection', 'hand', 'upload'].includes(item.id);
    }
    return true;
  });

  return (
    <div className="neo-brutalist-panel" style={{
      position: 'absolute',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '8px',
      background: 'var(--surface-color)',
      padding: '8px',
      borderRadius: '8px',
      border: 'var(--border-width) solid var(--border-color)',
      boxShadow: 'var(--shadow-md)',
      zIndex: 1000,
      pointerEvents: 'all'
    }}>
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const isShape = ['shape', 'rectangle', 'ellipse', 'diamond', 'triangle', 'arrow', 'line'].includes(activeTool);
        const isFreeDraw = ['freedraw', 'highlighter', 'eraser', 'laser'].includes(activeTool);
        
        let isActive = activeTool === item.id;
        if (item.id === 'shape') isActive = isShape;
        if (item.id === 'freedraw') isActive = isFreeDraw;

        const isHovered = hoveredTool === item.id;

        return (
          <button
            key={item.id}
            title={item.label}
            onMouseEnter={() => setHoveredTool(item.id)}
            onMouseLeave={() => setHoveredTool(null)}
            onClick={() => onToolSelect(item.id)}
            style={{
              background: isActive ? 'var(--text-main)' : (isHovered ? 'var(--accent-yellow)' : 'var(--surface-color)'),
              color: isActive ? 'var(--surface-color)' : 'var(--text-main)',
              border: '2px solid var(--border-color)',
              borderRadius: '4px',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: isActive ? 'none' : '2px 2px 0px var(--shadow-color)',
              transform: isActive ? 'translate(2px, 2px)' : 'none',
              transition: 'all 0.1s ease-in-out'
            }}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
          </button>
        );
      })}
    </div>
  );
});

export default BottomToolbar;
