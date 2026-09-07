import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import BottomToolbar from './BottomToolbar';
import ContextualPanel from './ContextualPanel';
import FileCard from './FileCard';
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



export default function ExcalidrawCanvas({
  excalidrawAPI: externalApi,
  activeTool,
  setActiveTool,
  addShape,
  themeMode,
  customCards = [],
  setCustomCards,
  onCardDoubleClick,
  onCardDelete,
  onCustomToolClick,
  onCanvasReady,
  onLinkOpen,
  ydoc,
  provider,
  awareness,
  elementsMap
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
  const [selectedElements, setSelectedElements] = useState([]);
  const elementsRef = useRef([]);
  const [zoom, setZoom] = useState(1);
  const [scrollX, setScrollX] = useState(0);
  const [scrollY, setScrollY] = useState(0);
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
    
    const isHighlighter = api.getAppState().activeTool?.type === 'freedraw' && activeTool === 'highlighter';
    const finalOpacity = isHighlighter ? 30 : 100;
    stateUpdates.currentItemOpacity = finalOpacity;
    elementUpdates.opacity = finalOpacity;

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

  // Handle Remote Yjs Sync
  useEffect(() => {
    if (!elementsMap || !api) return;

    const observer = (event, transaction) => {
      if (transaction.local) return; // Ignore local updates
      
      const remoteElements = [];
      elementsMap.forEach((el) => remoteElements.push(el));
      
      // Merge remote with local to preserve current state. 
      // Simplified CRDT logic: latest updated element wins, but since Excalidraw manages versions,
      // we can just supply the elements array and it reconciles internally if versions match,
      // or we just overwrite.
      api.updateScene({ elements: remoteElements });
    };

    elementsMap.observe(observer);
    return () => {
      elementsMap.unobserve(observer);
    };
  }, [elementsMap, api]);

  // Handle Remote Awareness (Cursors)
  useEffect(() => {
    if (!awareness || !api) return;

    const handleAwarenessUpdate = () => {
      const states = awareness.getStates();
      const collaborators = new Map();
      const clientId = awareness.clientID;

      states.forEach((state, client) => {
        if (client !== clientId && state.pointer && state.user) {
          collaborators.set(client, {
            pointer: state.pointer,
            button: state.button || 'up',
            selectedElementIds: state.selectedElementIds || {},
            username: state.user.name || 'Anonymous',
            color: { background: state.user.color || '#ff4444', stroke: '#000000' }
          });
        }
      });

      api.updateScene({ collaborators });
    };

    awareness.on('change', handleAwarenessUpdate);
    return () => awareness.off('change', handleAwarenessUpdate);
  }, [awareness, api]);

  const handleToolClick = useCallback((tool, e) => {
    if (e) e.stopPropagation();
    setActiveTool(tool);
    
    if (api) {
      const toolMap = {
        'selection': 'selection',
        'hand': 'hand',
        'freedraw': 'freedraw',
        'highlighter': 'freedraw', // Will handle opacity in style updates
        'laser': 'laser', // Or fallback to selection if laser unsupported
        'eraser': 'eraser',
        'shape': 'rectangle',
        'rectangle': 'rectangle',
        'ellipse': 'ellipse',
        'diamond': 'diamond',
        'triangle': 'triangle',
        'arrow': 'arrow',
        'line': 'line',
        'text': 'text',
      };
      const targetTool = toolMap[tool];
      if (targetTool) {
        api.updateScene({
          appState: { activeTool: { type: targetTool } }
        });
        
        // If highlighter, automatically set opacity low
        if (tool === 'highlighter') {
           updateStyle('size', 'xl');
           updateStyle('color', 'yellow'); // Trigger a style update with yellow default
        } else if (tool === 'freedraw') {
           updateStyle('size', 'm');
           updateStyle('color', 'black');
        }
      } else {
        // Handle Call, Upload, Create, Nested clicks here or via props
        if (onCustomToolClick) {
          onCustomToolClick(tool);
        }
      }
    }
  }, [api, setActiveTool]);


  const handleOnChange = useCallback((elements, appState) => {
    // 1. Track selection for ContextualPanel
    const selectedIds = appState.selectedElementIds;
    const selected = elements.filter(el => selectedIds[el.id]);
    setSelectedElements(selected);
    setZoom(appState.zoom.value);
    setScrollX(appState.scrollX);
    setScrollY(appState.scrollY);

    // Sync selection to awareness
    if (awareness) {
      awareness.setLocalStateField('selectedElementIds', selectedIds);
    }

    // 2. Custom Eraser Logic: Restore any non-freedraw element that was just deleted
    if (appState.activeTool.type === 'eraser') {
      let shouldRestore = false;
      const restoredElements = elements.map(el => {
        const isProtectedType = ['milanote-card', 'milanote-chart', 'file', 'nested-board', 'image'].includes(el.type);
        if (el.isDeleted && isProtectedType) {
          // Check if it was alive in our last ref
          const oldEl = elementsRef.current.find(e => e.id === el.id);
          if (oldEl && !oldEl.isDeleted) {
            shouldRestore = true;
            return { ...el, isDeleted: false };
          }
        }
        return el;
      });

      if (shouldRestore && api) {
        api.updateScene({ elements: restoredElements });
      }
    }
    
    // Sync to Yjs Map
    if (elementsMap && ydoc) {
      ydoc.transact(() => {
        elements.forEach(el => {
          const current = elementsMap.get(el.id);
          // Only sync if version changed or new element
          if (!current || current.version < el.version) {
            elementsMap.set(el.id, el);
          }
        });
      }, 'local');
    }

    elementsRef.current = elements;
  }, [api, elementsMap, ydoc, awareness]);

  const handlePointerUpdate = useCallback((payload) => {
    if (awareness) {
      awareness.setLocalStateField('pointer', payload.pointer);
      awareness.setLocalStateField('button', payload.button);
      awareness.setLocalStateField('user', {
        name: localStorage.getItem('userName') || 'Anonymous',
        color: localStorage.getItem('themeAccent') || '#ff4444'
      });
    }
  }, [awareness]);

  return (
    <div className="pinhole-bg" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <Excalidraw
        ref={excalidrawRef}
        excalidrawAPI={handleApiReady}
        onChange={handleOnChange}
        onPointerUpdate={handlePointerUpdate}
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

      {/* Cards Overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 10
      }}>
        {customCards.map(card => (
          <FileCard
            key={card.id}
            card={card}
            zoom={zoom}
            scrollX={scrollX}
            scrollY={scrollY}
            onUpdatePosition={(id, x, y) => {
              setCustomCards(prev => prev.map(c => c.id === id ? { ...c, x, y } : c));
            }}
            onDoubleClick={onCardDoubleClick}
            onDelete={onCardDelete}
          />
        ))}
      </div>

      {/* Zoom indicator */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        right: '24px',
        background: 'var(--surface-color)',
        border: 'var(--border-width) solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)',
        padding: '8px 12px',
        fontFamily: 'Inter, sans-serif',
        fontWeight: '700',
        fontSize: '14px',
        zIndex: 1000,
        pointerEvents: 'all',
        borderRadius: '8px',
      }}>
        {Math.round(zoom * 100)}%
      </div>

      <BottomToolbar 
        activeTool={activeTool}
        onToolSelect={(tool) => handleToolClick(tool)}
      />

      <ContextualPanel 
        activeTool={activeTool}
        selectedElements={selectedElements}
        activeColor={activeColor}
        activeSize={activeSize}
        activeFont={activeFont}
        activeAlign={activeAlign}
        onUpdateStyle={updateStyle}
        onToolSelect={(tool) => handleToolClick(tool)}
      />
    </div>
  );
}