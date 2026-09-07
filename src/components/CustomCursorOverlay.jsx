import React, { useEffect, useRef, useState, useMemo } from 'react';
import '../index.css';

export default function CustomCursorOverlay({ awareness, localClientId, enabled = true }) {
  const [cursors, setCursors] = useState(new Map());
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const lastPositionsRef = useRef(new Map());

  useEffect(() => {
    if (!awareness || !enabled) return;

    const updateCursors = () => {
      const states = awareness.getStates();
      const newCursors = new Map();

      states.forEach((state, clientId) => {
        if (clientId === localClientId) return;
        if (!state.pointer) return;

        const user = state.user || { name: 'Anonymous', color: '#ff4444' };
        const pointer = state.pointer;

        newCursors.set(clientId, {
          x: pointer.x,
          y: pointer.y,
          name: user.name || 'Anonymous',
          color: user.color || '#ff4444',
          lastUpdate: Date.now()
        });
      });

      setCursors(prev => {
        const merged = new Map(prev);
        newCursors.forEach((v, k) => merged.set(k, v));
        return merged;
      });
    };

    const handleAwarenessChange = () => {
      updateCursors();
    };

    awareness.on('change', handleAwarenessChange);
    updateCursors();

    return () => {
      awareness.off('change', handleAwarenessChange);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [awareness, localClientId, enabled]);

  const cursorElements = useMemo(() => {
    const elements = [];
    const now = Date.now();
    cursors.forEach((cursor, clientId) => {
      if (now - cursor.lastUpdate > 3000) return;
      elements.push(
        <CustomCursor
          key={clientId}
          x={cursor.x}
          y={cursor.y}
          name={cursor.name}
          color={cursor.color}
          clientId={clientId}
        />
      );
    });
    return elements;
  }, [cursors]);

  const handleMouseLeave = () => {
    setCursors(new Map());
  };

  if (!enabled) return null;

  return (
    <div
      ref={containerRef}
      className="custom-cursor-overlay"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        overflow: 'hidden'
      }}
      onMouseLeave={handleMouseLeave}
    >
      {cursorElements}
    </div>
  );
}

function CustomCursor({ x, y, name, color, clientId }) {
  const [showLabel, setShowLabel] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowLabel(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const cursorStyle = {
    transform: `translate(${x}px, ${y}px)`,
    pointerEvents: 'none',
    zIndex: 9999
  };

  return (
    <div className="remote-cursor" style={cursorStyle}>
      <div
        className="cursor-pointer"
        style={{
          width: '24px',
          height: '24px',
          background: color,
          border: '2px solid white',
          borderRadius: '50% 50% 50% 0',
          transform: 'rotate(-45deg) translate(-50%, -50%)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          transition: 'transform 0.05s ease-out'
        }}
      />
      {showLabel && (
        <div
          className="cursor-label"
          style={{
            position: 'absolute',
            top: '-28px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: color,
            color: 'white',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '600',
            whiteSpace: 'nowrap',
            fontFamily: 'Inter, sans-serif',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          {name}
        </div>
      )}
    </div>
  );
}