import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import BottomToolbar from './BottomToolbar';
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
    
    if (api) {
      const toolMap = {
        'selection': 'selection',
        'hand': 'hand',
        'freedraw': 'freedraw',
        'shape': 'rectangle',
        'text': 'text',
      };
      const targetTool = toolMap[tool];
      if (targetTool) {
        api.updateScene({
          appState: { activeTool: { type: targetTool } }
        });
      } else {
        // Handle Call, Upload, Create, Nested clicks here or via props
        console.log("Custom tool clicked:", tool);
      }
    }
  }, [api, setActiveTool]);


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
    </div>
  );
}