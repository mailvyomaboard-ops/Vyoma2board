import React, { useEffect, useRef, useState, useMemo } from 'react';
import '../index.css';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import '../index.css';

/**
 * Figma-style High-Performance Real-Time Cursor Overlay
 * - World-to-Screen coordinate projection
 * - Zero duplicated local cursor glitching
 * - Ephemeral awareness lifecycle with 4s inactive cleanup
 * - GPU-accelerated translate3d rendering
 */
export default function CustomCursorOverlay({ awareness, localClientId, enabled = true, zoom = 1, scrollX = 0, scrollY = 0 }) {
  const [cursors, setCursors] = useState(new Map());
  const [chatMessage, setChatMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingPos, setTypingPos] = useState({ x: 0, y: 0 });
  const inputRef = useRef(null);

  // Subscribe to Yjs Awareness for remote cursors
  useEffect(() => {
    if (!awareness || !enabled) return;

    const updateCursors = () => {
      const states = awareness.getStates();
      const newCursors = new Map();
      const currentClientId = localClientId || awareness.clientID;

      states.forEach((state, clientId) => {
        // Do not render local user's own cursor arrow (OS already provides it)
        if (clientId === currentClientId) return; 
        if (!state.pointer) return;

        const user = state.user || { name: 'Anonymous', color: '#00ffcc' };
        const pointer = state.pointer;

        newCursors.set(clientId, {
          x: pointer.x,
          y: pointer.y,
          name: user.name || 'Anonymous',
          color: user.color || '#00ffcc',
          chat: state.chat || null,
          lastUpdate: Date.now()
        });
      });

      setCursors(newCursors);
    };

    awareness.on('change', updateCursors);
    updateCursors();

    // Inactive cursor cleanup interval (prunes stale cursors after 4s)
    const interval = setInterval(() => {
      const now = Date.now();
      setCursors(prev => {
        let changed = false;
        const next = new Map(prev);
        next.forEach((cursor, id) => {
          if (now - cursor.lastUpdate > 4000) {
            next.delete(id);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1500);

    return () => {
      awareness.off('change', updateCursors);
      clearInterval(interval);
    };
  }, [awareness, localClientId, enabled]);

  // Project World / Scene coordinates to Screen coordinates
  const cursorElements = useMemo(() => {
    const elements = [];
    const now = Date.now();

    cursors.forEach((cursor, clientId) => {
      if (now - cursor.lastUpdate > 4000) return;

      const screenX = (cursor.x + scrollX) * zoom;
      const screenY = (cursor.y + scrollY) * zoom;

      elements.push(
        <CustomCursor
          key={clientId}
          x={screenX}
          y={screenY}
          name={cursor.name}
          color={cursor.color}
          chat={cursor.chat}
          clientId={clientId}
        />
      );
    });
    return elements;
  }, [cursors, zoom, scrollX, scrollY]);

  // Handle Slash ('/') Chat Overlay Trigger
  useEffect(() => {
    const onKeyDown = (e) => {
      const isInputFocused = document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
      if (e.key === '/' && !isInputFocused) {
        e.preventDefault();
        setIsTyping(true);
        setTimeout(() => inputRef.current?.focus(), 10);
      } else if (e.key === 'Escape' && isTyping) {
        setIsTyping(false);
        setChatMessage("");
        awareness?.setLocalStateField('chat', null);
      } else if (e.key === 'Enter' && isTyping) {
        setIsTyping(false);
        setTimeout(() => {
          awareness?.setLocalStateField('chat', null);
          setChatMessage("");
        }, 4000);
      }
    };

    const trackLocalPointerForChat = (e) => {
      if (!isTyping) {
        setTypingPos({ x: e.clientX, y: e.clientY });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousemove', trackLocalPointerForChat);
    
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousemove', trackLocalPointerForChat);
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

      {/* Ephemeral Cursor Chat Input when local user presses '/' */}
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
            left: typingPos.x + 16,
            top: typingPos.y + 24,
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid rgba(0, 255, 204, 0.4)',
            background: '#11131c',
            color: '#00ffcc',
            fontWeight: '600',
            fontSize: '12px',
            outline: 'none',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            pointerEvents: 'all',
            minWidth: '140px',
            zIndex: 10000,
            fontFamily: "'Inter', sans-serif"
          }}
          placeholder="Type live message..."
        />
      )}
    </div>
  );
}

function CustomCursor({ x, y, name, color, clientId, chat }) {
  const cursorStyle = {
    position: 'absolute',
    left: 0,
    top: 0,
    transform: `translate3d(${x}px, ${y}px, 0)`,
    pointerEvents: 'none',
    zIndex: 9999,
    willChange: 'transform',
    transition: 'transform 0.04s cubic-bezier(0, 0, 0.2, 1)'
  };

  return (
    <div className="remote-cursor" style={cursorStyle}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', top: 0, left: 0, filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.3))' }}>
        <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 01.35-.15h6.87a.5.5 0 00.35-.85L5.5 3.21z" fill={color} stroke="#090a0f" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      
      <div
        className="cursor-label"
        style={{
          position: 'absolute',
          top: '20px',
          left: '14px',
          background: color,
          color: '#090a0f',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '700',
          whiteSpace: 'nowrap',
          fontFamily: "'Inter', sans-serif",
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}
      >
        {name}
      </div>

      {chat && (
        <div
          style={{
            position: 'absolute',
            left: 14,
            top: 42,
            background: '#11131c',
            color: '#f0f6fc',
            border: `1px solid ${color}`,
            padding: '5px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            fontFamily: "'Inter', sans-serif",
            whiteSpace: 'pre-wrap',
            maxWidth: '220px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.35)'
          }}
        >
          {chat}
        </div>
      )}
    </div>
  );
}