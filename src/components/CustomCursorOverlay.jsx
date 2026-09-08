import React, { useEffect, useRef, useState, useMemo } from 'react';
import '../index.css';

export default function CustomCursorOverlay({ awareness, localClientId, enabled = true, zoom = 1, scrollX = 0, scrollY = 0 }) {
  const [cursors, setCursors] = useState(new Map());
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const [localMouse, setLocalMouse] = useState(null);
  const [chatMessage, setChatMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef(null);

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
          chat: state.chat || null,
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
      if (now - cursor.lastUpdate > 15000) return;
      elements.push(
        <CustomCursor
          key={clientId}
          x={(cursor.x + scrollX) * zoom}
          y={(cursor.y + scrollY) * zoom}
          name={cursor.name}
          color={cursor.color}
          chat={cursor.chat}
          clientId={clientId}
        />
      );
    });
    return elements;
  }, [cursors, zoom, scrollX, scrollY]);

  useEffect(() => {
    const onMouseMove = (e) => {
      setLocalMouse(prev => ({
        x: e.clientX,
        y: e.clientY,
        name: prev?.name || localStorage.getItem('userName') || 'You',
        color: prev?.color || 'var(--accent-blue, #3b82f6)'
      }));
      
      if (awareness) {
        awareness.setLocalStateField('pointer', { x: e.clientX, y: e.clientY });
      }
    };
    
    const onMouseLeave = () => {
      setLocalMouse(null);
    };

    const onKeyDown = (e) => {
      const isInputFocused = document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
      if (e.key === '/' && !isInputFocused) {
        e.preventDefault();
        setIsTyping(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      } else if (e.key === 'Escape' && isTyping) {
        setIsTyping(false);
        setChatMessage("");
        awareness?.setLocalStateField('chat', null);
      } else if (e.key === 'Enter' && isTyping) {
        setIsTyping(false);
        const currentChat = chatMessage;
        setTimeout(() => {
          awareness?.setLocalStateField('chat', null);
          setChatMessage("");
        }, 4000);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('keydown', onKeyDown);
    
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isTyping, awareness]);

  useEffect(() => {
    if (isTyping && awareness) {
      awareness.setLocalStateField('chat', chatMessage);
    }
  }, [chatMessage, isTyping, awareness]);

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
    >
      {cursorElements}
      {localMouse && (
        <>
          <CustomCursor
            x={localMouse.x}
            y={localMouse.y}
            name={localMouse.name}
            color={localMouse.color}
            chat={isTyping ? null : chatMessage}
            clientId="local"
            isLocal={true}
          />
          {isTyping && (
            <input
              ref={inputRef}
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onBlur={() => {
                if (!chatMessage) {
                  setIsTyping(false);
                  awareness?.setLocalStateField('chat', null);
                }
              }}
              style={{
                position: 'absolute',
                left: localMouse.x + 16,
                top: localMouse.y + 40,
                padding: '8px 12px',
                borderRadius: '4px',
                border: 'none',
                background: localMouse.color,
                color: 'white',
                fontWeight: '600',
                fontSize: '13px',
                outline: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                pointerEvents: 'all',
                minWidth: '100px',
                zIndex: 10000,
                fontFamily: 'Inter, sans-serif'
              }}
              placeholder="Type to chat..."
            />
          )}
        </>
      )}
    </div>
  );
}

function CustomCursor({ x, y, name, color, clientId, isLocal, chat }) {
  const cursorStyle = {
    position: 'absolute',
    left: 0,
    top: 0,
    transform: `translate(${x}px, ${y}px)`,
    pointerEvents: 'none',
    zIndex: 9999,
    transition: isLocal ? 'none' : 'transform 0.05s linear'
  };

  return (
    <div className="remote-cursor" style={cursorStyle}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', top: 0, left: 0, filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))' }}>
        <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 01.35-.15h6.87a.5.5 0 00.35-.85L5.5 3.21z" fill={color} stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      
      <div
        className="cursor-label"
        style={{
          position: 'absolute',
          top: '24px',
          left: '16px',
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

      {chat && (
        <div
          style={{
            position: 'absolute',
            left: 16,
            top: 48,
            background: color,
            color: 'white',
            padding: '6px 10px',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: '600',
            fontFamily: 'Inter, sans-serif',
            whiteSpace: 'pre-wrap',
            maxWidth: '200px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          {chat}
        </div>
      )}
    </div>
  );
}