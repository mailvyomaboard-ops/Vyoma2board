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
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--board-bg)' }}>
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
            viewBackgroundColor: themeMode === 'dark' ? '#222222' : '#f4f4f0',
            gridSize: 20,
          } 
        }}
        theme={themeMode === 'dark' ? 'dark' : 'light'}
        style={{ width: '100%', height: '100%' }}
        onLinkOpen={onLinkOpen}
      />

      {/* Bottom Toolbar - Integrated */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '8px',
        background: 'var(--sidebar-bg)',
        backdropFilter: 'none',
        padding: '8px 12px',
        borderRadius: '0',
        border: '4px solid var(--border-color)',
        boxShadow: '6px 6px 0px var(--shadow-color)',
        zIndex: 1000,
        pointerEvents: 'all',
      }}>
        {TOOLS.map((tool) => {
          const isActive = activeTool === tool.id || (tool.sub && tool.sub.includes(activeTool));
          const Icon = tool.icon;
          
          if (tool.sub) {
            return (
              <div key={tool.id} style={{ position: 'relative' }}>
                <button 
                  style={btnStyle(isActive)} 
                  onPointerDown={(e) => toggleMenu(tool.id, e)} 
                  title={tool.label}
                >
                  {activeTool === 'highlight' ? <span style={{fontWeight: 800, fontSize: 12}}>HL</span> :
                   activeTool === 'laser' ? <span style={{fontWeight: 800, fontSize: 12}}>LS</span> :
                   activeTool === 'eraser' ? <span style={{fontWeight: 800, fontSize: 12}}>ER</span> :
                   activeTool === 'ellipse' ? <Circle size={20} /> :
                   activeTool === 'triangle' ? <Triangle size={20} /> :
                   activeTool === 'diamond' ? <Diamond size={20} /> :
                   activeTool === 'hexagon' ? <Hexagon size={20} /> :
                   activeTool === 'cloud' ? <Cloud size={20} /> :
                   activeTool === 'heart' ? <Heart size={20} /> :
                   <Icon size={20} />}
                </button>
                {openMenu === tool.id && (
                  <div style={menuStyle}>
                    {tool.sub.map((subTool) => {
                      const SubIcon = DRAW_SUB_ICONS[subTool] || SHAPE_ICONS[subTool];
                      const isSubActive = activeTool === subTool;
                      return (
                        <button 
                          key={subTool} 
                          style={btnStyle(isSubActive)} 
                          onPointerDown={(e) => handleAction(subTool, e)} 
                          title={subTool}
                        >
                          <SubIcon size={20} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          
          return (
            <button 
              key={tool.id}
              style={btnStyle(isActive)} 
              onPointerDown={(e) => handleToolClick(tool.id, e)} 
              title={tool.label}
            >
              <Icon size={20} />
            </button>
          );
        })}
        
        <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
        
        {/* Quick Actions */}
        <button 
          style={btnStyle(false)} 
          onPointerDown={(e) => handleAction('Cards Menu', e)} 
          title="Add Card"
        >
          <LayoutTemplate size={20} />
        </button>
        
        <button 
          style={btnStyle(false)} 
          onPointerDown={(e) => handleAction('Charts Menu', e)} 
          title="Add Chart"
        >
          <PieChart size={20} />
        </button>
        
        <button 
          style={btnStyle(false)} 
          onPointerDown={(e) => handleAction('delete', e)} 
          title="Delete Selected"
        >
          <Trash2 size={20} />
        </button>
      </div>

      {/* Right Style Panel - Integrated */}
      {showPanel && showStylePanel && api && (
        <div style={{
          position: 'absolute',
          right: '24px',
          top: '80px',
          background: 'var(--sidebar-bg)',
          backdropFilter: 'none',
          border: '4px solid var(--border-color)',
          borderRadius: '0',
          boxShadow: '6px 6px 0px var(--shadow-color)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          width: '200px',
          pointerEvents: 'all',
          zIndex: 1000,
          color: '#000',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '4px solid var(--border-color)', paddingBottom: '8px' }}>
            <span style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-main)', textTransform: 'uppercase' }}>
              Style
            </span>
            <button 
              onClick={() => setShowStylePanel(false)}
              style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px' }}
            >
              ✕
            </button>
          </div>

          {/* Colors */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Color
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {Object.entries(NOTE_COLORS).map(([colorName, colorValues]) => (
                <button
                  key={colorName}
                  onClick={() => updateStyle('color', colorName)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '0',
                    background: colorValues.bg,
                    border: activeColor === colorName ? '4px solid var(--border-color)' : '2px solid var(--border-color)',
                    cursor: 'pointer',
                    boxShadow: activeColor === colorName ? '0px 0px 0px var(--shadow-color)' : '3px 3px 0px var(--shadow-color)',
                    transform: activeColor === colorName ? 'translate(3px, 3px)' : 'none',
                    transition: 'all 0.1s',
                  }}
                  title={colorName}
                />
              ))}
            </div>
          </div>

          {/* Fill */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Fill
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['none', 'semi', 'solid', 'pattern'].map((fill) => (
                <button 
                  key={fill} 
                  onClick={() => updateStyle('fill', fill)} 
                  style={{
                    flex: '1 0 40%',
                    padding: '6px',
                    background: activeFill === fill ? 'var(--accent-yellow)' : 'var(--sidebar-bg)',
                    border: '3px solid var(--border-color)',
                    color: '#000',
                    borderRadius: '0',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: activeFill === fill ? '0px 0px 0px var(--shadow-color)' : '3px 3px 0px var(--shadow-color)',
                    transform: activeFill === fill ? 'translate(3px, 3px)' : 'none',
                    transition: 'all 0.1s',
                  }}
                >
                  {fill}
                </button>
              ))}
            </div>
          </div>

          {/* Dash */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Stroke
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['draw', 'solid', 'dashed', 'dotted'].map((dash) => (
                <button 
                  key={dash} 
                  onClick={() => updateStyle('dash', dash)} 
                  style={{
                    flex: '1 0 40%',
                    padding: '6px',
                    background: activeDash === dash ? 'var(--accent-yellow)' : 'var(--sidebar-bg)',
                    border: '3px solid var(--border-color)',
                    color: '#000',
                    borderRadius: '0',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: activeDash === dash ? '0px 0px 0px var(--shadow-color)' : '3px 3px 0px var(--shadow-color)',
                    transform: activeDash === dash ? 'translate(3px, 3px)' : 'none',
                    transition: 'all 0.1s',
                  }}
                >
                  {dash}
                </button>
              ))}
            </div>
          </div>

          {/* Sizes */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Size
            </div>
            <input 
              type="range" 
              min="0" 
              max="3" 
              step="1"
              value={['s', 'm', 'l', 'xl'].indexOf(activeSize)}
              onChange={(e) => updateStyle('size', ['s', 'm', 'l', 'xl'][e.target.value])}
              style={{ width: '100%', cursor: 'pointer', accentColor: '#00ffcc' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#888' }}>
              <span>S</span><span>M</span><span>L</span><span>XL</span>
            </div>
          </div>

          {/* Font (Only for text tool) */}
          {['text', 'selection'].includes(activeTool) && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Font
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['draw', 'sans', 'serif', 'mono'].map((font) => (
                  <button 
                    key={font} 
                    onClick={() => updateStyle('font', font)} 
                    style={{
                      flex: '1 0 40%',
                      padding: '6px',
                      background: activeFont === font ? 'var(--accent-yellow)' : 'var(--sidebar-bg)',
                      border: '3px solid var(--border-color)',
                      color: '#000',
                      borderRadius: '0',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: activeFont === font ? '0px 0px 0px var(--shadow-color)' : '3px 3px 0px var(--shadow-color)',
                      transform: activeFont === font ? 'translate(3px, 3px)' : 'none',
                      transition: 'all 0.1s',
                    }}
                  >
                    {font}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Align (Only for text tool) */}
          {['text', 'selection'].includes(activeTool) && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Align
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { id: 'start', icon: <AlignLeft size={16} /> },
                  { id: 'middle', icon: <AlignCenter size={16} /> },
                  { id: 'end', icon: <AlignRight size={16} /> }
                ].map((align) => (
                  <button 
                    key={align.id} 
                    onClick={() => updateStyle('align', align.id)} 
                    style={{
                      ...({
                        flex: '1 0 40%',
                        padding: '6px',
                        background: activeAlign === align.id ? 'var(--accent-yellow)' : 'var(--sidebar-bg)',
                        border: '3px solid var(--border-color)',
                        color: '#000',
                        borderRadius: '0',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: activeAlign === align.id ? '0px 0px 0px var(--shadow-color)' : '3px 3px 0px var(--shadow-color)',
                        transform: activeAlign === align.id ? 'translate(3px, 3px)' : 'none',
                        transition: 'all 0.1s',
                      }),
                      flex: 1,
                      display: 'flex',
                      justifyContent: 'center',
                    }} 
                    title={align.id}
                  >
                    {align.icon}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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