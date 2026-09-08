import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Layout, Settings, Users, MessageSquare, Mic, MicOff, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { isTeacherRole } from '../lib/classMeta';
import '../index.css';

export default function TopBar({ 
  roomName, 
  roomInfo, 
  localUserId, 
  actingHost, 
  presentUsers = [],
  awareness,
  onOpenHostControls, 
  onOpenRoster, 
  onToggleChat,
  onOpenSettings,
  isMicOn,
  onToggleMic
}) {
  const navigate = useNavigate();
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const userRole = localStorage.getItem('userRole') || 'Casual';
  const isHost = actingHost === localUserId;
  const canUseTeacherTools = isTeacherRole(userRole) || (userRole === 'Casual' && isHost);

  useEffect(() => {
    let history = [];
    try {
      history = JSON.parse(localStorage.getItem('roomHistory') || '[]');
    } catch(e) {}
    
    const crumbs = [];
    let currentId = roomName;
    while (currentId) {
      const room = history.find(r => r.id === currentId);
      if (room) {
        crumbs.unshift(room);
        currentId = room.parentId;
      } else {
        crumbs.unshift({ id: currentId, name: currentId === 'test-room' ? 'Test Room' : currentId });
        break;
      }
    }
    setBreadcrumbs(crumbs);
  }, [roomName]);

  // Process users for the stack
  const orderedUsers = useMemo(() => {
    const me = presentUsers.find(u => u.id === localUserId);
    const others = presentUsers.filter(u => u.id !== localUserId);
    
    // Sort others by join order (assuming id represents join order naturally or just use it as fallback)
    // Then sort by isSpeaking so speakers bubble up
    others.sort((a, b) => {
      if (a.isSpeaking && !b.isSpeaking) return -1;
      if (!a.isSpeaking && b.isSpeaking) return 1;
      return a.id.localeCompare(b.id);
    });

    const list = [];
    if (me) list.push(me);
    else list.push({ id: localUserId, name: localStorage.getItem('userName') || 'You', color: 'var(--accent-blue)', isSpeaking: isMicOn });
    list.push(...others);
    return list;
  }, [presentUsers, localUserId, isMicOn]);

  const displayUsers = orderedUsers.slice(0, 4);
  const extraCount = orderedUsers.length > 4 ? orderedUsers.length - 3 : 0;

  return (
    <>
    {/* Main Centered Top Bar */}
    <div className="neo-brutalist-panel" style={{
      position: 'absolute',
      top: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      background: 'var(--surface-color)',
      padding: '8px 16px',
      borderRadius: '8px',
      border: 'var(--border-width) solid var(--border-color)',
      boxShadow: 'var(--shadow-md)',
      zIndex: 1000,
      pointerEvents: 'all'
    }}>
      
      {/* Dashboard Button */}
      <button 
        onClick={() => {
          if (window.confirm("Are you sure you want to leave the board?")) {
            navigate('/dashboard');
          }
        }}
        style={{
          background: 'var(--accent-yellow)',
          border: 'var(--border-width) solid var(--border-color)',
          borderRadius: '4px',
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--text-main)',
          boxShadow: 'var(--shadow-sm)',
          transition: 'all 0.1s'
        }}
        title="Dashboard"
      >
        <Layout size={18} />
      </button>

      {/* Settings Button */}
      <button 
        onClick={onOpenSettings}
        style={{
          background: 'var(--surface-color)',
          border: 'var(--border-width) solid var(--border-color)',
          borderRadius: '4px',
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--text-main)',
          boxShadow: 'var(--shadow-sm)',
          transition: 'all 0.1s'
        }}
        title="Settings"
      >
        <Settings size={18} />
      </button>

      <div style={{ width: '3px', height: '24px', background: 'var(--border-color)', opacity: 0.5 }}></div>

      {/* Breadcrumbs / Room Code */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '800', color: 'var(--text-main)', fontSize: '14px' }}>
        {breadcrumbs.map((crumb, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          return (
            <React.Fragment key={crumb.id}>
              <span 
                className="neo-badge" 
                style={{ 
                  background: isLast ? 'var(--accent-periwinkle)' : 'var(--surface-color)', 
                  color: '#000', 
                  fontSize: '12px', 
                  padding: '4px 8px', 
                  cursor: isLast ? 'default' : 'pointer',
                  border: isLast ? '2px solid #000' : '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }} 
                onClick={() => { if(!isLast) navigate(`/board/${crumb.id}`); }}
              >
                {crumb.name}
                {isLast && (
                  <span style={{ marginLeft: '4px', background: 'rgba(0,0,0,0.1)', padding: '2px 4px', borderRadius: '4px', fontFamily: 'monospace' }}>
                    {showCode ? crumb.id : '••••••••••••'}
                  </span>
                )}
                {isLast && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowCode(!showCode); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex' }}
                      title={showCode ? "Hide Room Code" : "Show Room Code"}
                    >
                      {showCode ? <EyeOff size={14} color="#000" /> : <Eye size={14} color="#000" />}
                    </button>
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        navigator.clipboard.writeText(crumb.id);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex' }}
                      title="Copy Room Code"
                    >
                      {copied ? <Check size={14} color="#00a000" /> : <Copy size={14} color="#000" />}
                    </button>
                  </div>
                )}
              </span>
              {!isLast && <span style={{ color: 'var(--text-muted)' }}>/</span>}
            </React.Fragment>
          );
        })}
      </div>

      <div style={{ width: '3px', height: '24px', background: 'var(--border-color)', opacity: 0.5 }}></div>

      {/* Host Controls Button */}
      {isHost && (
        <button
          onClick={onOpenHostControls}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'var(--accent-pink)', color: 'var(--text-main)',
            border: 'var(--border-width) solid var(--border-color)',
            borderRadius: '4px',
            padding: '6px 12px',
            fontSize: '13px',
            fontWeight: '800',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)'
          }}
          title="Host controls"
        >
          <Shield size={16} /> Host
        </button>
      )}

      {/* Teach Button (replaces Roster) */}
      {canUseTeacherTools && (
        <button
          onClick={onOpenRoster}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'var(--accent-green)', color: 'var(--text-main)',
            border: 'var(--border-width) solid var(--border-color)',
            borderRadius: '4px',
            padding: '6px 12px',
            fontSize: '13px',
            fontWeight: '800',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <Users size={16} /> Teach
        </button>
      )}

      <div style={{ width: '3px', height: '24px', background: 'var(--border-color)', opacity: 0.5 }}></div>

      {/* Mic Toggle Button */}
      <button
        onClick={onToggleMic}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: isMicOn ? 'var(--accent-green)' : 'var(--accent-pink)', 
          color: 'var(--text-main)',
          border: 'var(--border-width) solid var(--border-color)',
          borderRadius: '4px',
          padding: '6px 12px',
          fontSize: '13px',
          fontWeight: '800',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)'
        }}
        title="Toggle Microphone"
      >
        {isMicOn ? <Mic size={16} /> : <MicOff size={16} />}
      </button>

    </div>

    {/* Floating Avatar Stack - Top Right */}
    <div style={{
      position: 'absolute',
      top: '16px',
      right: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      zIndex: 1000,
      pointerEvents: 'all'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'row-reverse' }}>
        {displayUsers.map((user, idx) => {
          if (idx === 3 && extraCount > 0) {
            return (
              <div key="overflow" style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'var(--surface-color)', border: '2px solid var(--border-color)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '900', fontSize: '13px', boxShadow: 'var(--shadow-sm)',
                marginLeft: '-8px', zIndex: 0
              }} title={`+${extraCount} more users`}>
                +{extraCount}
              </div>
            );
          }

          const initial = (user.name || 'A').charAt(0).toUpperCase();
          
          return (
            <div key={user.id} style={{
              position: 'relative',
              width: '36px', height: '36px', borderRadius: '50%',
              background: user.color || 'var(--accent-blue)', border: '2px solid var(--border-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: '900', fontSize: '14px', color: '#fff',
              boxShadow: 'var(--shadow-sm)',
              marginLeft: idx === 0 ? '0' : '-8px',
              zIndex: displayUsers.length - idx
            }} title={user.name || 'Anonymous'}>
              {initial}
              {user.isSpeaking && (
                <>
                  <div style={{
                    position: 'absolute', top: '-4px', left: '-4px', right: '-4px', bottom: '-4px',
                    borderRadius: '50%', border: '2px solid var(--accent-blue)',
                    animation: 'ripple 1.5s infinite ease-out'
                  }} />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
    </>
  );
}
