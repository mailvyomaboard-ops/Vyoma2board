import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare, Maximize, Minimize } from 'lucide-react';
import { getWsUrl } from '../config';
import { useParams } from 'react-router-dom';
import '../index.css';

export default function GroupChat({ onClose, isFullscreen = false, onToggleFullscreen }) {
  const { id } = useParams();
  const roomId = id || 'global-moodboard';
  const userName = localStorage.getItem('userName') || 'Anonymous';
  const accentColor = JSON.parse(localStorage.getItem('themeAccent') || '{"hex": "#92a9e1"}');
  
  const [messages, setMessages] = useState([
    { id: 1, user: 'System', text: 'Welcome to the room chat!', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isSystem: true }
  ]);
  const [input, setInput] = useState('');
  
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem('token') || (import.meta.env.DEV ? 'dev-mode-token-12345' : '');
    const wsUrl = `${getWsUrl()}/comms?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!active) return;
      ws.send(JSON.stringify({
        type: 'join',
        roomId,
        userId: Math.random().toString(36).substring(7),
        name: userName,
        color: accentColor.hex
      }));
    };

    ws.onmessage = (msg) => {
      if (!active) return;
      try {
        const data = JSON.parse(msg.data);
        if (data.type === 'chat-message') {
          setMessages(prev => [...prev, data.message]);
        } else if (data.type === 'chat-history') {
          setMessages(prev => [...prev, ...data.messages]);
        }
      } catch (err) {
        console.error("Chat WebSocket error", err);
      }
    };

    return () => {
      active = false;
      ws.close();
    };
  }, [roomId, userName]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !wsRef.current || wsRef.current.readyState !== 1) return;
    
    const newMsg = {
      id: Date.now(),
      user: userName,
      text: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    wsRef.current.send(JSON.stringify({
      type: 'chat-message',
      roomId,
      message: newMsg
    }));
    
    setInput('');
  };

  const handleClose = () => {
    if (isFullscreen && onToggleFullscreen) {
      onToggleFullscreen(false);
    } else {
      onClose();
    }
  };

  if (!isFullscreen) {
    return (
      <div className="neo-window" style={{
        position: 'absolute',
        right: 16,
        top: 16,
        bottom: 16,
        width: '320px',
        zIndex: 100,
      }}>
        <div className="neo-window-header" style={{ background: 'var(--accent-yellow)', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={18} />
            <span style={{ fontWeight: '900', textTransform: 'uppercase', fontSize: '14px' }}>Group Chat</span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button 
              className="neo-btn" 
              onClick={() => onToggleFullscreen?.(true)}
              style={{ padding: '4px', display: 'flex' }}
              title="Fullscreen"
            >
              <Maximize size={16} />
            </button>
            <button className="neo-btn" onClick={onClose} style={{ padding: '4px', display: 'flex' }}>
              <X size={16} />
            </button>
          </div>
        </div>
        
        <div className="neo-window-content" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--surface-color)' }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ 
                display: 'flex', flexDirection: 'column', gap: '4px',
                background: msg.isSystem ? 'var(--accent-green)' : '#f1f5f9',
                border: '2px solid #000',
                padding: '8px 12px',
                borderRadius: '8px',
                boxShadow: '2px 2px 0px #000'
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: '800', fontSize: '14px', color: '#000' }}>{msg.user}</span>
                  <span style={{ fontSize: '10px', color: '#000', fontWeight: 'bold' }}>{msg.time}</span>
                </div>
                <div style={{ fontSize: '14px', color: '#000', lineHeight: 1.4, fontWeight: '500' }}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ padding: '16px', borderTop: '3px solid #000', background: 'var(--surface-color)' }}>
            <form onSubmit={sendMessage} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message room..."
                className="neo-input"
                style={{ flex: 1, padding: '8px 12px' }}
              />
              <button type="submit" className="neo-btn" style={{ padding: '8px 12px', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="modal-overlay" 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        backgroundColor: 'rgba(0,0,0,0.8)', 
        zIndex: 99999, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}
      onClick={handleClose}
    >
      <div 
        className="neo-window" 
        style={{
          width: '100vw',
          height: '100vh',
          maxWidth: '100vw',
          maxHeight: '100vh',
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface-color)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="neo-window-header" style={{ background: 'var(--accent-yellow)', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={18} />
            <span style={{ fontWeight: '900', textTransform: 'uppercase', fontSize: '14px' }}>Group Chat</span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button 
              className="neo-btn" 
              onClick={() => onToggleFullscreen?.(false)}
              style={{ padding: '4px', display: 'flex' }}
              title="Exit Fullscreen"
            >
              <Minimize size={16} />
            </button>
            <button className="neo-btn" onClick={onClose} style={{ padding: '4px', display: 'flex' }}>
              <X size={16} />
            </button>
          </div>
        </div>
        
        <div className="neo-window-content" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--surface-color)' }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ 
                display: 'flex', flexDirection: 'column', gap: '4px',
                background: msg.isSystem ? 'var(--accent-green)' : '#f1f5f9',
                border: '2px solid #000',
                padding: '12px 16px',
                borderRadius: '12px',
                boxShadow: '3px 3px 0px #000',
                maxWidth: '80%',
                alignSelf: msg.user === userName ? 'flex-end' : 'flex-start'
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: '800', fontSize: '16px', color: '#000' }}>{msg.user}</span>
                  <span style={{ fontSize: '12px', color: '#000', fontWeight: 'bold' }}>{msg.time}</span>
                </div>
                <div style={{ fontSize: '16px', color: '#000', lineHeight: 1.5, fontWeight: '500' }}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ padding: '24px', borderTop: '3px solid #000', background: 'var(--surface-color)', flexShrink: 0 }}>
            <form onSubmit={sendMessage} style={{ display: 'flex', gap: '12px', maxWidth: '800px', margin: '0 auto' }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message room..."
                className="neo-input"
                style={{ flex: 1, padding: '12px 16px', fontSize: '16px' }}
              />
              <button type="submit" className="neo-btn" style={{ padding: '12px 24px', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Send size={22} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}