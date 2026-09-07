import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare, Search, ChevronLeft, User as UserIcon } from 'lucide-react';
import { useCallContext } from '../context/CallContext';
import '../index.css';

export default function ChatPanel({ onClose, roomInfo }) {
  const { 
    myUserId, 
    activeUsers, 
    chatMessages, 
    dmHistory, 
    sendChatMessage, 
    sendDirectMessage 
  } = useCallContext();

  const [activeView, setActiveView] = useState('inbox'); // 'inbox' | 'group' | targetUserId
  const [searchQuery, setSearchQuery] = useState('');
  const [input, setInput] = useState('');
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, dmHistory, activeView]);

  useEffect(() => {
    const handleOpenDm = (e) => {
      setActiveView(e.detail.targetId);
    };
    window.addEventListener('open-dm', handleOpenDm);
    return () => window.removeEventListener('open-dm', handleOpenDm);
  }, []);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (activeView === 'group') {
      sendChatMessage(input);
    } else {
      sendDirectMessage(activeView, input);
    }
    
    setInput('');
  };

  // Sort users: Hosts/Cohosts first, then alphabetical
  const sortedUsers = [...activeUsers]
    .filter(u => u.id !== myUserId && u.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const roleA = roomInfo?.roles?.[a.id] || (a.id === roomInfo?.hostId ? 'admin' : 'member');
      const roleB = roomInfo?.roles?.[b.id] || (b.id === roomInfo?.hostId ? 'admin' : 'member');
      
      const isHostA = roleA === 'admin' || roleA === 'co-admin';
      const isHostB = roleB === 'admin' || roleB === 'co-admin';

      if (isHostA && !isHostB) return -1;
      if (!isHostA && isHostB) return 1;

      return a.name.localeCompare(b.name);
    });

  const getChatName = () => {
    if (activeView === 'group') return 'Group Chat';
    const target = activeUsers.find(u => u.id === activeView);
    return target ? target.name : 'Direct Message';
  };

  return (
    <div className="neo-window" style={{
      position: 'absolute',
      right: 16,
      top: 16,
      bottom: 16,
      width: '340px',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {activeView === 'inbox' ? (
        <>
          <div className="neo-window-header" style={{ background: 'var(--accent-yellow)', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} />
              <span style={{ fontWeight: '900', textTransform: 'uppercase', fontSize: '14px' }}>Chats</span>
            </div>
            <button className="neo-btn" onClick={onClose} style={{ padding: '4px', display: 'flex' }}>
              <X size={16} />
            </button>
          </div>
          
          <div className="neo-window-content" style={{ padding: 0, display: 'flex', flexDirection: 'column', flex: 1, background: 'var(--surface-color)' }}>
            <div style={{ padding: '12px', borderBottom: '3px solid #000' }}>
              <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', border: '2px solid #000', borderRadius: '4px', padding: '4px 8px' }}>
                <Search size={16} color="#000" />
                <input 
                  type="text" 
                  placeholder="Search participants..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', padding: '4px 8px', width: '100%', fontSize: '14px' }}
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {/* Group Chat Item */}
              <div 
                onClick={() => setActiveView('group')}
                style={{ 
                  padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', 
                  borderBottom: '3px solid #000', cursor: 'pointer', background: 'var(--accent-blue)', color: '#000'
                }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface-color)', border: '3px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UsersIcon />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: '900', fontSize: '16px' }}>Group Chat</span>
                  <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Everyone in the room</span>
                </div>
              </div>

              {/* Users List */}
              {sortedUsers.map(user => {
                const role = roomInfo?.roles?.[user.id] || (user.id === roomInfo?.hostId ? 'admin' : 'member');
                return (
                  <div 
                    key={user.id}
                    onClick={() => setActiveView(user.id)}
                    style={{ 
                      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', 
                      borderBottom: '2px solid #000', cursor: 'pointer', background: 'var(--surface-color)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface-color)'}
                  >
                    <div style={{ 
                      width: '40px', height: '40px', background: user.color, 
                      border: '3px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: '900', fontSize: '18px'
                    }}>
                      {user.name[0]?.toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: '800', fontSize: '14px' }}>{user.name}</span>
                      {role === 'admin' && <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--accent-pink)' }}>HOST</span>}
                      {role === 'co-admin' && <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--accent-blue)' }}>CO-HOST</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="neo-window-header" style={{ background: 'var(--accent-yellow)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="neo-btn" onClick={() => setActiveView('inbox')} style={{ padding: '4px', display: 'flex' }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontWeight: '900', textTransform: 'uppercase', fontSize: '14px', flex: 1 }}>{getChatName()}</span>
            <button className="neo-btn" onClick={onClose} style={{ padding: '4px', display: 'flex' }}>
              <X size={16} />
            </button>
          </div>

          <div className="neo-window-content" style={{ padding: 0, display: 'flex', flexDirection: 'column', flex: 1, background: 'var(--surface-color)', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeView === 'group' && chatMessages.map(msg => (
                <MessageBubble key={msg.id} msg={msg} isMe={msg.user === (localStorage.getItem('userName') || 'You')} />
              ))}
              {activeView !== 'group' && dmHistory.filter(m => m.from === activeView || m.to === activeView).map((msg, i) => (
                <MessageBubble key={i} msg={{ user: msg.from === myUserId ? 'You' : getChatName(), text: msg.message.text, time: msg.message.time }} isMe={msg.from === myUserId} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: '16px', borderTop: '3px solid #000', background: 'var(--surface-color)' }}>
              <form onSubmit={sendMessage} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Message..."
                  className="neo-input"
                  style={{ flex: 1, padding: '8px 12px' }}
                />
                <button type="submit" className="neo-btn" style={{ padding: '8px 12px', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Send size={18} />
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const MessageBubble = ({ msg, isMe }) => (
  <div style={{ 
    display: 'flex', flexDirection: 'column', gap: '4px',
    background: msg.isSystem ? 'var(--accent-green)' : isMe ? 'var(--accent-blue)' : '#f1f5f9',
    alignSelf: msg.isSystem ? 'center' : isMe ? 'flex-end' : 'flex-start',
    maxWidth: '85%',
    border: '2px solid #000',
    padding: '8px 12px',
    borderRadius: '8px',
    boxShadow: '2px 2px 0px #000'
  }}>
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px' }}>
      <span style={{ fontWeight: '800', fontSize: '12px', color: '#000' }}>{isMe ? 'You' : msg.user}</span>
      <span style={{ fontSize: '10px', color: '#000', fontWeight: 'bold' }}>{msg.time}</span>
    </div>
    <div style={{ fontSize: '14px', color: '#000', lineHeight: 1.4, fontWeight: '500' }}>
      {msg.text}
    </div>
  </div>
);
