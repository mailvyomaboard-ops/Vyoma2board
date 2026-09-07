import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { MousePointer2, Hand, Pen, Square, Circle, Triangle, Diamond, Hexagon, Cloud, Heart, ArrowRight, Type, Eraser, LayoutTemplate, Trash2, Highlighter, Zap, PieChart, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import '../index.css';

const NOTE_COLORS = {
  black: { bg: '#1e1e1e', text: '#ffffff' },
  gray: { bg: '#a1a1aa', text: '#000000' },
  red: { bg: '#f87171', text: '#000000' },
  orange: { bg: '#fb923c', text: '#000000' },
  yellow: { bg: '#facc15', text: '#000000' },
  green: { bg: '#4ade80', text: '#000000' },
  blue: { bg: '#60a5fa', text: '#000000' },
  purple: { bg: '#c084fc', text: '#000000' },
};

const TOOLS = [
  { id: 'selection', icon: MousePointer2, label: 'Select' },
  { id: 'hand', icon: Hand, label: 'Pan' },
  { id: 'draw', icon: Pen, label: 'Draw', sub: ['draw', 'highlight', 'laser', 'eraser'] },
  { id: 'rectangle', icon: Square, label: 'Shapes', sub: ['rectangle', 'ellipse', 'triangle', 'diamond', 'hexagon', 'cloud', 'heart'] },
  { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
  { id: 'text', icon: Type, label: 'Text' },
];

const SHAPE_ICONS = {
  rectangle: Square, ellipse: Circle, triangle: Triangle,
  diamond: Diamond, hexagon: Hexagon, cloud: Cloud, heart: Heart,
};

const DRAW_SUB_ICONS = {
  draw: Pen, highlight: Highlighter, laser: Zap, eraser: Eraser,
};

export default function ExcalidrawCanvas({
  excalidrawAPI: externalApi,
  activeTool,
  setActiveTool,
  addShape,
  themeMode,
  onCanvasReady,
  onLinkOpen,
}) {
  const [internalApi, setInternalApi] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [activeColor, setActiveColor] = useState('black');
  const [activeFill, setActiveFill] = useState('none');
  const [activeDash, setActiveDash] = useState('solid');
  const [activeSize, setActiveSize] = useState('m');
  const [activeFont, setActiveFont] = useState('sans');
  const [activeAlign, setActiveAlign] = useState('middle');
  const [showStylePanel, setShowStylePanel] = useState(true);
  const [zoom, setZoom] = useState(1);
  const api = externalApi || internalApi;

  const excalidrawRef = useRef(null);

  useEffect(() => {
    if (externalApi) {
      setInternalApi(externalApi);
    }
  }, [externalApi]);

  const handleApiReady = useCallback((api) => {
    setInternalApi(api);
    onCanvasReady?.(api);
  }, [onCanvasReady]);

  const updateStyle = useCallback((key, value) => {
    if (!api) return;
    
    const stateUpdates = {};
    const elementUpdates = {};
    
    if (key === 'color') {
      const hex = NOTE_COLORS[value]?.bg || '#000000';
      stateUpdates.currentItemStrokeColor = hex;
      elementUpdates.strokeColor = hex;
      setActiveColor(value);
    } else if (key === 'fill') {
      const fillMap = { none: 'transparent', semi: 'hachure', solid: 'solid', pattern: 'cross-hatch' };
      stateUpdates.currentItemFillStyle = fillMap[value];
      elementUpdates.fillStyle = fillMap[value];
      if (value !== 'none' && activeColor) {
        stateUpdates.currentItemBackgroundColor = NOTE_COLORS[activeColor]?.bg || '#000000';
        elementUpdates.backgroundColor = NOTE_COLORS[activeColor]?.bg || '#000000';
      } else {
        stateUpdates.currentItemBackgroundColor = 'transparent';
        elementUpdates.backgroundColor = 'transparent';
      }
      setActiveFill(value);
    } else if (key === 'dash') {
      const dashMap = { draw: 'solid', solid: 'solid', dashed: 'dashed', dotted: 'dotted' };
      const roughnessMap = { draw: 1, solid: 0, dashed: 0, dotted: 0 };
      stateUpdates.currentItemStrokeStyle = dashMap[value];
      stateUpdates.currentItemRoughness = roughnessMap[value];
      elementUpdates.strokeStyle = dashMap[value];
      elementUpdates.roughness = roughnessMap[value];
      setActiveDash(value);
    } else if (key === 'size') {
      const sizeMap = { s: 1, m: 2, l: 4, xl: 8 };
      stateUpdates.currentItemStrokeWidth = sizeMap[value];
      elementUpdates.strokeWidth = sizeMap[value];
      setActiveSize(value);
    } else if (key === 'font') {
      const fontMap = { draw: 1, sans: 2, serif: 2, mono: 3 };
      stateUpdates.currentItemFontFamily = fontMap[value];
      elementUpdates.fontFamily = fontMap[value];
      setActiveFont(value);
    } else if (key === 'align') {
      const alignMap = { start: 'left', middle: 'center', end: 'right' };
      stateUpdates.currentItemTextAlign = alignMap[value];
      elementUpdates.textAlign = alignMap[value];
      setActiveAlign(value);
    }

    const elements = api.getSceneElements();
    const appState = api.getAppState();
    
    let updatedElements = false;
    const newElements = elements.map(el => {
      if (appState.selectedElementIds[el.id]) {
        updatedElements = true;
        return { ...el, ...elementUpdates };
      }
      return el;
    });

    if (updatedElements) {
      api.updateScene({ elements: newElements, appState: stateUpdates });
    } else {
      api.updateScene({ appState: stateUpdates });
    }
  }, [api, activeColor]);

  const handleToolClick = useCallback((tool, e) => {
    if (e) e.stopPropagation();
    setActiveTool(tool);
    setOpenMenu(null);
    
    if (api) {
      const toolMap = {
        'selection': 'selection',
        'hand': 'hand',
        'draw': 'freedraw',
        'pen': 'freedraw',
        'highlight': 'freedraw',
        'laser': 'freedraw',
        'eraser': 'eraser',
        'rectangle': 'rectangle',
        'ellipse': 'ellipse',
        'triangle': 'triangle',
        'diamond': 'diamond',
        'hexagon': 'hexagon',
        'cloud': 'cloud',
        'heart': 'heart',
        'arrow': 'arrow',
        'line': 'line',
        'text': 'text',
      };
      const targetTool = toolMap[tool] || 'selection';
      api.updateScene({
        appState: { activeTool: { type: targetTool } }
      });
    }
  }, [api, setActiveTool]);

  const handleAction = useCallback((action, e) => {
    if (e) e.stopPropagation();
    setOpenMenu(null);
    if (action === 'delete') {
      if (api) {
        const selectedIds = Object.keys(api.getAppState().selectedElementIds);
        if (selectedIds.length > 0) {
          api.deleteShapes(selectedIds);
        }
      }
    } else if (action === 'Cards Menu') {
      addShape('milanote-card');
    } else if (action === 'Charts Menu') {
      addShape('milanote-chart');
    } else {
      handleToolClick(action, e);
    }
  }, [api, addShape, handleToolClick]);

  const toggleMenu = useCallback((menu, e) => {
    if (e) e.stopPropagation();
    setOpenMenu(openMenu === menu ? null : menu);
  }, [openMenu]);

  const btnStyle = (isActive) => ({
    width: '40px',
    height: '40px',
    padding: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: isActive ? 'var(--accent-yellow)' : 'var(--sidebar-bg)',
    border: '3px solid var(--border-color)',
    color: '#000',
    borderRadius: '0',
    cursor: 'pointer',
    boxShadow: isActive ? '0px 0px 0px var(--shadow-color)' : '3px 3px 0px var(--shadow-color)',
    transform: isActive ? 'translate(3px, 3px)' : 'none',
    transition: 'all 0.1s',
  });

  const menuStyle = {
    position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '16px',
    background: 'var(--sidebar-bg)', backdropFilter: 'none', padding: '8px', borderRadius: '0', 
    border: '4px solid var(--border-color)', boxShadow: '6px 6px 0px var(--shadow-color)',
    display: 'flex', gap: '8px', zIndex: 1001,
  };

  const showPanel = ['selection', 'rectangle', 'ellipse', 'triangle', 'diamond', 'hexagon', 'cloud', 'heart', 'arrow', 'line', 'text', 'draw', 'freedraw', 'eraser'].includes(activeTool);

  return (
    <div className="pinhole-bg" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <Excalidraw
        ref={excalidrawRef}
        excalidrawAPI={handleApiReady}
        zenModeEnabled={true}
        UIOptions={{
          canvasActions: { 
            loadScene: false, export: false, saveAsImage: false, clearCanvas: false, saveToActiveFile: false, toggleTheme: false, changeViewBackgroundColor: false
          },
          toolbar: { tooltips: false },
          animations: false,
        }}
        initialData={{ 
          appState: { 
            theme: themeMode === 'dark' ? 'dark' : 'light',
            viewBackgroundColor: 'transparent',
          } 
        }}
        theme={themeMode === 'dark' ? 'dark' : 'light'}
        style={{ width: '100%', height: '100%' }}
        onLinkOpen={onLinkOpen}
      />

      {/* Zoom indicator */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        right: '24px',
        background: 'var(--sidebar-bg)',
        border: '3px solid var(--border-color)',
        boxShadow: '3px 3px 0px var(--shadow-color)',
        padding: '8px 12px',
        fontFamily: 'Space Grotesk, sans-serif',
        fontWeight: '700',
        fontSize: '14px',
        zIndex: 1000,
        pointerEvents: 'all',
      }}>
{Math.round(zoom * 100)}%
      </div>
    </div>
  );
}