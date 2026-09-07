import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import BottomToolbar from './BottomToolbar';
import ContextualPanel from './ContextualPanel';
import FileCard from './FileCard';
import CustomCursorOverlay from './CustomCursorOverlay';
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



/**
 * @param {{
 *   activeTool: string,
 *   setActiveTool: (tool: string) => void,

 *   customCards?: any[],
 *   setCustomCards: (updater: any) => void,
 *   onCardDoubleClick: (card: any) => void,
 *   onCardDelete: (id: string) => void,
 *   onCustomToolClick: (tool: string) => void,
 *   onCanvasReady: (api: any) => void,
 *   onLinkOpen: (element: any, event: any) => void,
 *   ydoc: any,
 *   provider?: any,
 *   awareness: any,
 *   elementsMap: any,
 *   viewModeEnabled: boolean
 * }} props
 */
export default function ExcalidrawCanvas({
  activeTool,
  setActiveTool,

  customCards = [],
  setCustomCards,
  onCardDoubleClick,
  onCardDelete,
  onCustomToolClick,
  onCanvasReady,
  onLinkOpen,
  ydoc,
  awareness,
  elementsMap,
  viewModeEnabled,
  localClientId
}) {
  const [internalApi, setInternalApi] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [activeColor, setActiveColor] = useState('black');
  const [activeFill, setActiveFill] = useState('none');
  const [activeDash, setActiveDash] = useState('solid');
  const [activeSize, setActiveSize] = useState('m');
  const [activeFont, setActiveFont] = useState('sans');
  const [activeAlign, setActiveAlign] = useState('middle');
  const [selectedElements, setSelectedElements] = useState([]);
  const elementsRef = useRef([]);
  const lastSyncedVersionsRef = useRef(new Map());
  const [zoom, setZoom] = useState(1);
  const [scrollX, setScrollX] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const api = internalApi;

  // Stable refs for mutable values used in callbacks — avoids recreating
  // handleOnChange/handlePointerUpdate on every render (which would cause
  // Excalidraw's Jotai subscriptions to re-subscribe → infinite loop)
  const apiRef = useRef(null);
  const awarenessRef = useRef(null);
  const elementsMapRef = useRef(null);
  const ydocRef = useRef(null);
  const onCustomToolClickRef = useRef(null);
  const isApplyingRemoteRef = useRef(false);
  const collaboratorsUpdateTimerRef = useRef(null);
  const pendingCollaboratorsRef = useRef(new Map());
  apiRef.current = api;
  awarenessRef.current = awareness;
  elementsMapRef.current = elementsMap;
  ydocRef.current = ydoc;
  onCustomToolClickRef.current = onCustomToolClick;

  // Stable memoized props — new objects every render cause Excalidraw to
  // re-run internal effects via tunnel-rat / Jotai → infinite update loop
  const excalidrawUIOptions = useMemo(() => ({
    canvasActions: {
      loadScene: false, export: /** @type {any} */ (false), saveAsImage: false,
      clearCanvas: false, saveToActiveFile: false,
      toggleTheme: false, changeViewBackgroundColor: false
    },
    toolbar: { tooltips: false },
    animations: false,
  }), []);

  const excalidrawInitialData = useMemo(() => ({
    appState: {
      theme: 'light',
      viewBackgroundColor: 'transparent',
    }
  }), []); // intentionally run once — initialData is only read on mount by Excalidraw


  const onCanvasReadyRef = useRef(onCanvasReady);
  useEffect(() => {
    onCanvasReadyRef.current = onCanvasReady;
  }, [onCanvasReady]);

  const handleApiReady = useCallback((api) => {
    setInternalApi(api);
    if (onCanvasReadyRef.current) {
      onCanvasReadyRef.current(api);
    }
  }, []);

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
      
      isApplyingRemoteRef.current = true;
      
      const localElements = api.getSceneElements();
      const localMap = new Map(localElements.map(e => [e.id, e]));
      
      const remoteElements = Array.from(elementsMap.values());
      const newElementsMap = new Map();

      // Apply remote elements, but preserve local if local is newer
      remoteElements.forEach(remoteEl => {
        const localEl = localMap.get(remoteEl.id);
        if (localEl && localEl.version >= remoteEl.version) {
          newElementsMap.set(localEl.id, localEl);
        } else {
          newElementsMap.set(remoteEl.id, remoteEl);
        }
      });

      // Add any local elements that aren't in Yjs yet (e.g. actively drawing)
      localElements.forEach(el => {
        if (!newElementsMap.has(el.id)) {
          newElementsMap.set(el.id, el);
        }
      });

      api.updateScene({ elements: Array.from(newElementsMap.values()) });
      
      // Reset flag after React flushes
      setTimeout(() => { isApplyingRemoteRef.current = false; }, 0);
    };

    elementsMap.observe(observer);
    return () => {
      elementsMap.unobserve(observer);
    };
  }, [elementsMap, api]);

  // Handle Remote Awareness (Cursors) - debounced to prevent excessive updates
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

      // Debounce collaborator updates to prevent excessive api.updateScene calls
      pendingCollaboratorsRef.current = collaborators;
      if (collaboratorsUpdateTimerRef.current) {
        clearTimeout(collaboratorsUpdateTimerRef.current);
      }
      collaboratorsUpdateTimerRef.current = setTimeout(() => {
        if (apiRef.current) {
          apiRef.current.updateScene({ collaborators: pendingCollaboratorsRef.current });
        }
      }, 16); // ~60fps
    };

    awareness.on('change', handleAwarenessUpdate);
    return () => {
      awareness.off('change', handleAwarenessUpdate);
      if (collaboratorsUpdateTimerRef.current) {
        clearTimeout(collaboratorsUpdateTimerRef.current);
      }
    };
  }, [awareness, api]);

  const handleToolClick = useCallback((tool, e) => {
    if (e) e.stopPropagation();
    setActiveTool(tool);

    // Tools that don't need Excalidraw API — open modals immediately
    const noApiTools = ['upload', 'create', 'nested', 'call'];
    if (noApiTools.includes(tool)) {
      onCustomToolClickRef.current?.(tool);
      return;
    }

    // Tools that require Excalidraw API
    if (apiRef.current) {
      const toolMap = {
        'selection': 'selection',
        'hand': 'hand',
        'freedraw': 'freedraw',
        'highlighter': 'freedraw',
        'laser': 'laser',
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
        apiRef.current.updateScene({
          appState: { activeTool: { type: targetTool } }
        });

        if (tool === 'highlighter') {
          updateStyle('size', 'xl');
          updateStyle('color', 'yellow');
        } else if (tool === 'freedraw') {
          updateStyle('size', 'm');
          updateStyle('color', 'black');
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setActiveTool, updateStyle]);


  const handleOnChange = useCallback((elements, appState) => {
    // Skip Yjs sync if we're currently applying remote updates (prevents loop)
    if (isApplyingRemoteRef.current) {
      elementsRef.current = elements;
      return;
    }
    
    // 1. Track selection for ContextualPanel
    const selectedIds = appState.selectedElementIds;
    const selected = elements.filter(el => selectedIds[el.id]);
    setSelectedElements(prev => {
      if (prev.length === selected.length && prev.every((el, i) => el.id === selected[i].id && el.version === selected[i].version)) {
        return prev;
      }
      return selected;
    });
    setZoom(appState.zoom.value);
    setScrollX(appState.scrollX);
    setScrollY(appState.scrollY);

    // Sync selection to awareness efficiently
    if (awarenessRef.current) {
      const currentSelected = awarenessRef.current.getLocalState()?.selectedElementIds;
      if (JSON.stringify(currentSelected) !== JSON.stringify(selectedIds)) {
        awarenessRef.current.setLocalStateField('selectedElementIds', selectedIds);
      }
    }

    // 2. Custom Eraser Logic: Restore any non-freedraw element that was just deleted
    if (appState.activeTool.type === 'eraser') {
      let shouldRestore = false;
      const restoredElements = elements.map(el => {
        const isProtectedType = ['milanote-card', 'milanote-chart', 'file', 'nested-board', 'image'].includes(el.type);
        if (el.isDeleted && isProtectedType) {
          const oldEl = elementsRef.current.find(e => e.id === el.id);
          if (oldEl && !oldEl.isDeleted) {
            shouldRestore = true;
            return { ...el, isDeleted: false };
          }
        }
        return el;
      });

      if (shouldRestore && apiRef.current) {
        apiRef.current.updateScene({ elements: restoredElements });
      }
    }
    
    // Sync to Yjs Map efficiently
    if (elementsMapRef.current && ydocRef.current) {
      ydocRef.current.transact(() => {
        const updates = [];
        elements.forEach(el => {
          const lastKnownVersion = lastSyncedVersionsRef.current.get(el.id) || 0;
          if (el.version > lastKnownVersion) {
            updates.push(el);
            lastSyncedVersionsRef.current.set(el.id, el.version);
          }
        });
        updates.forEach(el => {
          elementsMapRef.current.set(el.id, el);
        });
      }, 'local');
    }

    elementsRef.current = elements;
  // Empty dep array: all mutable values accessed via refs — this callback
  // is intentionally stable for the lifetime of the component.
  }, []);

  const lastUserRef = useRef(null);

  const handlePointerUpdate = useCallback((payload) => {
    if (awarenessRef.current) {
      awarenessRef.current.setLocalStateField('pointer', payload.pointer);
      awarenessRef.current.setLocalStateField('button', payload.button);
      
      const userName = localStorage.getItem('userName') || 'Anonymous';
      const userColor = localStorage.getItem('themeAccent') || '#ff4444';
      
      const currentUser = lastUserRef.current;
      if (!currentUser || currentUser.name !== userName || currentUser.color !== userColor) {
        const newUser = { name: userName, color: userColor };
        awarenessRef.current.setLocalStateField('user', newUser);
        lastUserRef.current = newUser;
      }
    }
  }, []);

  const excalidrawStyle = useMemo(() => ({ width: '100%', height: '100%' }), []);
  
  const onLinkOpenRef = useRef(onLinkOpen);
  useEffect(() => {
    onLinkOpenRef.current = onLinkOpen;
  }, [onLinkOpen]);
  
  const handleLinkOpen = useCallback((element, event) => {
    if (onLinkOpenRef.current) {
      onLinkOpenRef.current(element, event);
    }
  }, []);

  const excalidrawElement = useMemo(() => (
    <Excalidraw
      excalidrawAPI={handleApiReady}
      onChange={handleOnChange}
      onPointerUpdate={handlePointerUpdate}
      viewModeEnabled={viewModeEnabled}
      zenModeEnabled={true}
      UIOptions={excalidrawUIOptions}
      initialData={excalidrawInitialData}
      theme='light'
      gridModeEnabled={true}
      style={excalidrawStyle}
      onLinkOpen={handleLinkOpen}
    />
  ), [
    handleApiReady, handleOnChange, handlePointerUpdate, viewModeEnabled,
    excalidrawUIOptions, excalidrawInitialData, excalidrawStyle, handleLinkOpen
  ]);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {excalidrawElement}

      {/* Custom Cursor Overlay - Figma-style remote cursors */}
      <CustomCursorOverlay
        awareness={awareness}
        localClientId={localClientId}
        enabled={!!awareness}
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
              // Only allow dragging if we have edit permissions
              if (!viewModeEnabled) {
                setCustomCards(prev => prev.map(c => c.id === id ? { ...c, x, y } : c));
              }
            }}
            onDoubleClick={onCardDoubleClick}
            onDelete={onCardDelete}
            canEdit={!viewModeEnabled}
          />
        ))}
      </div>

      {/* Zoom indicator */}
      <div className="neo-brutalist-panel" style={{
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

      {!viewModeEnabled && (
        <BottomToolbar
          activeTool={activeTool}
          onToolSelect={handleToolClick}
          onMenuToggle={setOpenMenu}
          openMenu={openMenu}
          canUndo={false}
          canRedo={false}
          onUndo={() => {}}
          onRedo={() => {}}
        />
      )}

      {!viewModeEnabled && (
        <ContextualPanel
          activeTool={activeTool}
          selectedElements={selectedElements}
          onStyleChange={updateStyle}
          activeColor={activeColor}
          activeFill={activeFill}
          activeDash={activeDash}
          activeSize={activeSize}
          activeFont={activeFont}
          activeAlign={activeAlign}
          onToolChange={(tool) => handleToolClick(tool)}
          onDelete={() => {
            const newElements = api.getSceneElements().filter(
              (el) => !selectedElements.find((sel) => sel.id === el.id)
            );
            api.updateScene({ elements: newElements });
          }}
          onBringForward={() => {}}
          onSendBackward={() => {}}
        />
      )}
    </div>
  );
}