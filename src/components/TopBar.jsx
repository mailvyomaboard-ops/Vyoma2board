import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Layout, 
  Settings, 
  Users, 
  MessageSquare, 
  Mic, 
  MicOff, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  MoreVertical,
  X
} from 'lucide-react';
import { isTeacherRole } from '../lib/classMeta';
import '../index.css';

/**
 * TopBar Navigation Component
 * Dual-layout header for Desktop and Mobile viewports with zero overlap.
 * 
 * Complexity:
 * - Time: O(U log U) sorting active users where U <= 50.
 * - Space: O(U) user stack display.
 */
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
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const userRole = localStorage.getItem('userRole') || 'Casual';
  const isHost = actingHost === localUserId;
  const canUseTeacherTools = isTeacherRole(userRole) || (userRole === 'Casual' && isHost);

  useEffect(() => {
    let history = [];
    try {
      history = JSON.parse(localStorage.getItem('roomHistory') || '[]');
    } catch (e) {
      history = [];
    }

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
      {/* -------------------------------------------------------------
          MAIN FLOATING TOP BAR (Desktop Centered & Mobile Pinned)
          ------------------------------------------------------------- */}
      <div 
        className="neo-brutalist-panel top-bar-panel" 
        style={{
          position: 'fixed',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'var(--surface-color)',
          padding: '6px 14px',
          borderRadius: '8px',
          border: 'var(--border-width) solid var(--border-color)',
          boxShadow: 'var(--shadow-md)',
          zIndex: 1000,
          pointerEvents: 'all'
        }}
      >
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
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-main)',
            boxShadow: 'var(--shadow-sm)',
            flexShrink: 0
          }}
          title="Exit to Dashboard"
        >
          <Layout size={17} />
        </button>

        {/* Desktop Divider */}
        <div className="desktop-only" style={{ width: '2px', height: '22px', background: 'var(--border-color)', opacity: 0.5 }}></div>

        {/* Desktop Settings Button */}
        <button
          className="desktop-only"
          onClick={onOpenSettings}
          style={{
            background: 'var(--surface-color)',
            border: 'var(--border-width) solid var(--border-color)',
            borderRadius: '4px',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-main)',
            boxShadow: 'var(--shadow-sm)',
            flexShrink: 0
          }}
          title="Settings"
        >
          <Settings size={17} />
        </button>

        {/* Desktop Breadcrumbs & Room Code */}
        <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', color: 'var(--text-main)', fontSize: '14px' }}>
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
                  onClick={() => { if (!isLast) navigate(`/board/${crumb.id}`); }}
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

        {/* Mobile Room Title Pill */}
        <div className="mobile-only" style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
          <span 
            className="neo-badge" 
            style={{ 
              background: 'var(--accent-periwinkle)', 
              fontSize: '12px', 
              fontWeight: '900', 
              padding: '4px 8px', 
              maxWidth: '120px', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap' 
            }}
          >
            {roomName}
          </span>
        </div>

        {/* Desktop Host Controls */}
        {isHost && (
          <button
            className="desktop-only"
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
            title="Host Controls"
          >
            <Shield size={15} /> Host
          </button>
        )}

        {/* Desktop Teaching Tools */}
        {canUseTeacherTools && (
          <button
            className="desktop-only"
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
            <Users size={15} /> Teach
          </button>
        )}

        {/* Desktop Divider */}
        <div className="desktop-only" style={{ width: '2px', height: '22px', background: 'var(--border-color)', opacity: 0.5 }}></div>

        {/* Mobile Collaborators Pill (Opens Roster) */}
        <button
          className="mobile-only"
          onClick={onOpenRoster}
          style={{
            background: 'var(--accent-blue)',
            color: '#fff',
            border: '2px solid #000',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: '900',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            flexShrink: 0
          }}
          title="Participants Roster"
        >
          <Users size={13} /> {orderedUsers.length}
        </button>

        {/* Mic Toggle Button (Desktop & Mobile) */}
        <button
          onClick={onToggleMic}
          style={{
            background: isMicOn ? 'var(--accent-green)' : 'var(--surface-color)',
            border: 'var(--border-width) solid var(--border-color)',
            borderRadius: '4px',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-main)',
            boxShadow: 'var(--shadow-sm)',
            flexShrink: 0
          }}
          title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
        >
          {isMicOn ? <Mic size={16} /> : <MicOff size={16} />}
        </button>

        {/* Chat Toggle Button (Desktop & Mobile) */}
        <button
          onClick={onToggleChat}
          style={{
            background: 'var(--surface-color)',
            border: 'var(--border-width) solid var(--border-color)',
            borderRadius: '4px',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-main)',
            boxShadow: 'var(--shadow-sm)',
            flexShrink: 0
          }}
          title="Open Room Chat"
        >
          <MessageSquare size={16} />
        </button>

        {/* Mobile More Options Button */}
        <button
          className="mobile-only"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          style={{
            background: showMobileMenu ? 'var(--text-main)' : 'var(--surface-color)',
            color: showMobileMenu ? 'var(--surface-color)' : 'var(--text-main)',
            border: 'var(--border-width) solid var(--border-color)',
            borderRadius: '4px',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            flexShrink: 0
          }}
          title="More Options"
        >
          <MoreVertical size={16} />
        </button>
      </div>

      {/* -------------------------------------------------------------
          MOBILE DROPDOWN MENU (Non-overlapping action sheet)
          ------------------------------------------------------------- */}
      {showMobileMenu && (
        <div
          className="neo-brutalist-panel mobile-only"
          style={{
            position: 'fixed',
            top: '58px',
            right: '10px',
            background: 'var(--surface-color)',
            border: '3px solid #000',
            boxShadow: '4px 4px 0 #000',
            borderRadius: '8px',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 1001,
            width: '180px'
          }}
        >
          <button
            onClick={() => { onOpenSettings(); setShowMobileMenu(false); }}
            className="neo-btn"
            style={{ width: '100%', background: 'var(--surface-color)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}
          >
            <Settings size={15} /> Board Settings
          </button>

          {isHost && (
            <button
              onClick={() => { onOpenHostControls(); setShowMobileMenu(false); }}
              className="neo-btn"
              style={{ width: '100%', background: 'var(--accent-pink)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}
            >
              <Shield size={15} /> Host Controls
            </button>
          )}

          <button
            onClick={() => {
              navigator.clipboard.writeText(roomName);
              setCopied(true);
              setTimeout(() => {
                setCopied(false);
                setShowMobileMenu(false);
              }, 1500);
            }}
            className="neo-btn"
            style={{ width: '100%', background: copied ? 'var(--accent-green)' : 'var(--accent-yellow)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Code Copied!' : 'Copy Room Code'}
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------
          DESKTOP-ONLY FLOATING AVATAR STACK (Top Right)
          ------------------------------------------------------------- */}
      <div 
        className="desktop-only" 
        style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 1000,
          pointerEvents: 'all'
        }}
      >
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
              <div 
                key={user.id} 
                style={{
                  position: 'relative',
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: user.color || 'var(--accent-blue)', border: '2px solid var(--border-color)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: '900', fontSize: '14px', color: '#fff',
                  boxShadow: 'var(--shadow-sm)',
                  marginLeft: idx === 0 ? '0' : '-8px',
                  zIndex: displayUsers.length - idx
                }} 
                title={user.name || 'Anonymous'}
              >
                {initial}
                {user.isSpeaking && (
                  <div style={{
                    position: 'absolute', top: '-4px', left: '-4px', right: '-4px', bottom: '-4px',
                    borderRadius: '50%', border: '2px solid var(--accent-blue)',
                    animation: 'ripple 1.5s infinite ease-out'
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
