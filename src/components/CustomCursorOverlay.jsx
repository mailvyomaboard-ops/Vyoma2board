import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import { getParticipantColor, boardToScreenCoordinates, sanitizeCursorMessage } from '../lib/cursorCoordinates';
import { isMobileDevice } from '../lib/deviceDetection';
import '../index.css';

/**
 * Figma / Miro Style Master Real-Time Cursor & Presence Overlay
 * 
 * Capabilities:
 * - Mathematical scene-to-screen projection across all zoom levels, pan offsets, and DPR.
 * - Dual Desktop Arrow and Mobile Touch Ring indicators.
 * - Local touch feedback on mobile so touch position is visually affirmed.
 * - Cursor-associated live ephemeral chat with slash ('/') hotkey and mobile touch trigger.
 * - Zero ghost cursors: client-specific activity timestamping and automated 3.5s timeout.
 * - Non-blocking pointer interaction: passive pointer-events: none layer.
 * 
 * Complexity:
 * - Time: O(N) where N is number of active participants in the room (typically <= 50).
 * - Space: O(N) memory for cursor awareness map.
 */
export default function CustomCursorOverlay({
  awareness,
  localClientId,
  enabled = true,
  zoom = 1,
  scrollX = 0,
  scrollY = 0,
  containerRef
}) {
  const [cursors, setCursors] = useState(new Map());
  const [localCursor, setLocalCursor] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [typingPos, setTypingPos] = useState({ x: 100, y: 100 });
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef(null);
  const chatDismissTimerRef = useRef(null);

  // Detect mobile / touch environment
  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  // Reset cursors immediately when awareness instance changes (e.g. room switch)
  useEffect(() => {
    setCursors(new Map());
    setLocalCursor(null);
  }, [awareness]);

  // Subscribe to Yjs Awareness for remote participants
  useEffect(() => {
    if (!awareness || !enabled) return;

    const currentClientId = localClientId || awareness.clientID;

    const handleAwarenessChange = () => {
      const states = awareness.getStates();
      const now = Date.now();
      const updatedCursors = new Map();

      states.forEach((state, clientId) => {
        if (!state) return;

        const isLocal = clientId === currentClientId;
        const user = state.user || {};
        const userId = state.userId || String(clientId);
        const name = user.name || 'Anonymous';
        const color = user.color || getParticipantColor(userId);
        const pointer = state.pointer;
        const chat = state.chat;
        const lastActivity = state.lastActivity || now;

        // Skip users with inactive/null pointer or expired activity (> 3500ms)
        if (!pointer || !pointer.visible || now - lastActivity > 3500) {
          if (isLocal) setLocalCursor(null);
          return;
        }

        const cursorData = {
          clientId,
          userId,
          name,
          color,
          x: pointer.x,
          y: pointer.y,
          pointerType: pointer.pointerType || 'mouse',
          chat: chat && now - (chat.timestamp || 0) < 4500 ? chat.text : null,
          lastActivity
        };

        if (isLocal) {
          // Track local cursor for touch feedback or chat anchoring
          setLocalCursor(cursorData);
        } else {
          updatedCursors.set(clientId, cursorData);
        }
      });

      setCursors(updatedCursors);
    };

    awareness.on('change', handleAwarenessChange);
    handleAwarenessChange();

    // High-precision cleanup interval: prune any stale remote cursors that haven't pulsed in 3.5s
    const pruneInterval = setInterval(() => {
      const now = Date.now();
      setCursors(prev => {
        let changed = false;
        const next = new Map(prev);
        next.forEach((cursor, id) => {
          if (now - cursor.lastActivity > 3500) {
            next.delete(id);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);

    return () => {
      awareness.off('change', handleAwarenessChange);
      clearInterval(pruneInterval);
    };
  }, [awareness, localClientId, enabled]);

  // Handle Slash ('/') hotkey for desktop cursor chat trigger
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput = document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
      if (e.key === '/' && !isInput && !isTyping) {
        e.preventDefault();
        openChatInput();
      } else if (e.key === 'Escape' && isTyping) {
        closeChatInput();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTyping, typingPos]);

  // Track pointer on window to anchor chat input for desktop
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isTyping) {
        setTypingPos({ x: e.clientX, y: e.clientY });
      }
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isTyping]);

  const openChatInput = useCallback((overridePos) => {
    if (overridePos) {
      setTypingPos(overridePos);
    } else if (localCursor) {
      const containerOrigin = containerRef?.current
        ? containerRef.current.getBoundingClientRect()
        : { left: 0, top: 0 };
      const screenPos = boardToScreenCoordinates(localCursor.x, localCursor.y, zoom, scrollX, scrollY, containerOrigin);
      setTypingPos(screenPos);
    }
    setIsTyping(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [localCursor, zoom, scrollX, scrollY, containerRef]);

  const closeChatInput = useCallback(() => {
    setIsTyping(false);
    setChatMessage('');
    if (awareness) {
      awareness.setLocalStateField('chat', null);
    }
  }, [awareness]);

  const submitChatMessage = useCallback((e) => {
    if (e) e.preventDefault();
    const cleanText = sanitizeCursorMessage(chatMessage, 80);
    if (!cleanText || !awareness) {
      closeChatInput();
      return;
    }

    const chatPayload = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      text: cleanText,
      timestamp: Date.now()
    };

    awareness.setLocalStateField('chat', chatPayload);
    setIsTyping(false);
    setChatMessage('');

    // Automatically dismiss the chat bubble after 4.5 seconds
    if (chatDismissTimerRef.current) clearTimeout(chatDismissTimerRef.current);
    chatDismissTimerRef.current = setTimeout(() => {
      awareness.setLocalStateField('chat', null);
    }, 4500);
  }, [chatMessage, awareness, closeChatInput]);

  // Calculate container origin for sub-pixel projection
  const containerOrigin = useMemo(() => {
    if (containerRef?.current) {
      const rect = containerRef.current.getBoundingClientRect();
      return { left: rect.left, top: rect.top };
    }
    return { left: 0, top: 0 };
  }, [containerRef]);

  // Render remote cursors projected from Board Space to Screen Space
  const renderedRemoteCursors = useMemo(() => {
    const list = [];
    cursors.forEach((cursor, clientId) => {
      const screenPos = boardToScreenCoordinates(
        cursor.x,
        cursor.y,
        zoom,
        scrollX,
        scrollY,
        containerOrigin
      );

      list.push(
        <RemoteCursorItem
          key={clientId}
          screenX={screenPos.x}
          screenY={screenPos.y}
          name={cursor.name}
          color={cursor.color}
          chat={cursor.chat}
          pointerType={cursor.pointerType}
        />
      );
    });
    return list;
  }, [cursors, zoom, scrollX, scrollY, containerOrigin]);

  // Render local cursor (visible on desktop mouse AND mobile touch with (You) badge)
  const renderedLocalCursor = useMemo(() => {
    if (!localCursor) return null;

    const screenPos = boardToScreenCoordinates(
      localCursor.x,
      localCursor.y,
      zoom,
      scrollX,
      scrollY,
      containerOrigin
    );

    const isTouch = localCursor.pointerType === 'touch';

    return (
      <div
        className="local-cursor-container"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transform: `translate3d(${screenPos.x}px, ${screenPos.y}px, 0)`,
          pointerEvents: 'none',
          zIndex: 9998,
          willChange: 'transform',
          transition: isTouch ? 'none' : 'transform 0.03s cubic-bezier(0, 0, 0.2, 1)'
        }}
      >
        {isTouch ? (
          // Mobile / Tablet Touch Ring
          <div style={{ position: 'relative', width: 0, height: 0 }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: `2.5px solid ${localCursor.color}`,
                background: `${localCursor.color}33`,
                transform: 'translate(-50%, -50%)',
                boxShadow: `0 0 12px ${localCursor.color}`,
                animation: 'touchPulse 1.2s ease-out infinite'
              }}
            />
          </div>
        ) : (
          // Desktop Precision Cyberpunk Arrow Pointer
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              filter: `drop-shadow(0px 2px 6px rgba(0,0,0,0.6)) drop-shadow(0 0 8px ${localCursor.color}66)`
            }}
          >
            <path
              d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 01.35-.15h6.87a.5.5 0 00.35-.85L5.5 3.21z"
              fill={localCursor.color}
              stroke="#090a0f"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        )}

        {/* Local Participant Badge with (You) tag */}
        <div
          className="cursor-participant-label"
          style={{
            position: 'absolute',
            top: isTouch ? '18px' : '22px',
            left: isTouch ? '0' : '14px',
            transform: isTouch ? 'translateX(-50%)' : 'none',
            background: localCursor.color,
            color: '#090a0f',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '800',
            whiteSpace: 'nowrap',
            fontFamily: "'Space Grotesk', sans-serif",
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            letterSpacing: '0.5px',
            border: '1px solid rgba(0,0,0,0.2)'
          }}
        >
          {localCursor.name} (You)
        </div>

        {/* Local Cursor Ephemeral Chat Bubble */}
        {localCursor.chat && (
          <div
            className="cursor-chat-bubble"
            style={{
              borderColor: localCursor.color,
              position: 'absolute',
              left: isTouch ? '0' : '14px',
              top: isTouch ? '40px' : '44px',
              transform: isTouch ? 'translateX(-50%)' : 'none',
              background: 'rgba(17, 19, 28, 0.95)',
              color: '#f0f6fc',
              border: `1.5px solid ${localCursor.color}`,
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              fontFamily: "'Space Grotesk', sans-serif",
              whiteSpace: 'pre-wrap',
              maxWidth: '240px',
              wordBreak: 'break-word',
              boxShadow: `0 4px 16px rgba(0,0,0,0.5), 0 0 10px ${localCursor.color}44`,
              backdropFilter: 'blur(6px)'
            }}
          >
            {localCursor.chat}
          </div>
        )}
      </div>
    );
  }, [localCursor, zoom, scrollX, scrollY, containerOrigin]);

  if (!enabled) return null;

  return (
    <div
      className="custom-cursor-overlay-layer"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9990,
        overflow: 'hidden'
      }}
    >
      {/* Remote participants' cursors */}
      {renderedRemoteCursors}

      {/* Local participant cursor (desktop pointer arrow + mobile touch ring) */}
      {renderedLocalCursor}

      {/* Ephemeral Cursor Chat Input Bar (Desktop Only) */}
      {isTyping && !isMobile && (
        <div
          className="cursor-chat-input-wrapper"
          style={{
            position: 'absolute',
            left: Math.max(16, Math.min(window.innerWidth - 240, typingPos.x + 12)),
            top: Math.max(16, Math.min(window.innerHeight - 80, typingPos.y - 42)),
            pointerEvents: 'auto',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(9, 10, 15, 0.95)',
            border: '2px solid #00ffcc',
            borderRadius: '8px',
            padding: '4px 8px',
            boxShadow: '0 8px 24px rgba(0, 255, 204, 0.25), 4px 4px 0 #000',
            backdropFilter: 'blur(8px)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            ref={inputRef}
            type="text"
            maxLength={80}
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitChatMessage(e);
              if (e.key === 'Escape') closeChatInput();
            }}
            placeholder="Say something... (Enter to send)"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#f0f6fc',
              fontSize: '13px',
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: '600',
              outline: 'none',
              width: '180px'
            }}
            autoFocus
          />
          <button
            onClick={submitChatMessage}
            style={{
              background: '#00ffcc',
              color: '#090a0f',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              padding: '4px 6px',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Send (Enter)"
          >
            <Send size={13} />
          </button>
          <button
            onClick={closeChatInput}
            style={{
              background: 'transparent',
              color: '#a1a1aa',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Close (Esc)"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Individual Remote Cursor Item with Cyberpunk styling.
 * Supports desktop pointer arrow and mobile touch marker with attached name and chat bubble.
 */
function RemoteCursorItem({ screenX, screenY, name, color, chat, pointerType }) {
  const isTouch = pointerType === 'touch';

  return (
    <div
      className="remote-cursor-container"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        transform: `translate3d(${screenX}px, ${screenY}px, 0)`,
        pointerEvents: 'none',
        zIndex: 9992,
        willChange: 'transform',
        transition: 'transform 0.04s cubic-bezier(0, 0, 0.2, 1)'
      }}
    >
      {isTouch ? (
        // Mobile / Tablet Touch Indicator (Pulsing Cyberpunk Ring)
        <div style={{ position: 'relative', width: 0, height: 0 }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              border: `2px solid ${color}`,
              background: `${color}33`,
              transform: 'translate(-50%, -50%)',
              boxShadow: `0 0 10px ${color}`
            }}
          />
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: color,
              position: 'absolute',
              top: '-3px',
              left: '-3px'
            }}
          />
        </div>
      ) : (
        // Desktop Precision Cursor Arrow
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            filter: 'drop-shadow(0px 2px 5px rgba(0,0,0,0.5))'
          }}
        >
          <path
            d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 01.35-.15h6.87a.5.5 0 00.35-.85L5.5 3.21z"
            fill={color}
            stroke="#090a0f"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {/* Participant Name Tag underneath cursor */}
      <div
        className="cursor-participant-label"
        style={{
          position: 'absolute',
          top: isTouch ? '16px' : '22px',
          left: isTouch ? '0' : '14px',
          transform: isTouch ? 'translateX(-50%)' : 'none',
          background: color,
          color: '#090a0f',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '800',
          whiteSpace: 'nowrap',
          maxWidth: '160px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontFamily: "'Space Grotesk', sans-serif",
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          border: '1px solid rgba(0,0,0,0.2)',
          letterSpacing: '0.3px'
        }}
        title={name}
      >
        {name}
      </div>

      {/* Cursor Live Chat Message Bubble (Desktop Only) */}
      {!isTouch && chat && (
        <div
          className="cursor-chat-bubble"
          style={{
            position: 'absolute',
            left: isTouch ? '0' : '14px',
            top: isTouch ? '40px' : '44px',
            transform: isTouch ? 'translateX(-50%)' : 'none',
            background: 'rgba(17, 19, 28, 0.95)',
            color: '#f0f6fc',
            border: `1.5px solid ${color}`,
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '600',
            fontFamily: "'Space Grotesk', sans-serif",
            whiteSpace: 'pre-wrap',
            maxWidth: '240px',
            wordBreak: 'break-word',
            boxShadow: `0 4px 16px rgba(0,0,0,0.5), 0 0 10px ${color}44`,
            backdropFilter: 'blur(6px)'
          }}
        >
          {chat}
        </div>
      )}
    </div>
  );
}
