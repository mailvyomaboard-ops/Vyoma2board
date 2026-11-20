import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Layout, Settings, Users, MessageSquare, Mic, MicOff, Eye, EyeOff, Copy, Check, MoreVertical } from 'lucide-react';
import { isTeacherRole } from '../lib/classMeta';
import '../index.css';

export default function TopBar({
  roomName,
  roomInfo,
  localUserId,
  actingHost,
  export default function TopBar({
    roomName,
    roomInfo,
    localUserId,
    actingHost,
    presentUsers = [],
    awareness,
    onOpenHostControls,
    onOpenRoster,
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
      } catch (e) { }

    } catch (e) { }

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
    <div className="neo-brutalist-panel top-bar-panel" style={{
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
          transition: 'all 0.1s',
          flexShrink: 0
        }}
        title="Dashboard"
      >
        <Layout size={18} />
      </button>
      {/* Main Centered Top Bar */}
      <div className="neo-brutalist-panel top-bar-panel" style={{
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

        {/* Settings Button */}
        <button
          className="desktop-only"
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
            transition: 'all 0.1s',
            flexShrink: 0
          }}
          title="Settings"
        >
          <Settings size={18} />
        </button>
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
            transition: 'all 0.1s',
            flexShrink: 0
          }}
          title="Dashboard"
        >
          <Layout size={18} />
        </button>

        <div className="desktop-only" style={{ width: '3px', height: '24px', background: 'var(--border-color)', opacity: 0.5 }}></div>
        {/* Settings Button */}
        <button
          className="desktop-only"
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
            transition: 'all 0.1s',
            flexShrink: 0
          }}
          title="Settings"
        >
          <Settings size={18} />
        </button>

        {/* Breadcrumbs / Room Code (Desktop) */}
        <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '800', color: 'var(--text-main)', fontSize: '14px' }}>
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
        <div className="desktop-only" style={{ width: '3px', height: '24px', background: 'var(--border-color)', opacity: 0.5 }}></div>

        {/* Compact Room Name Badge for Mobile */}
        <div className="mobile-only" style={{ display: 'flex', alignItems: 'center' }}>
          <span className="neo-badge" style={{ background: 'var(--accent-periwinkle)', fontSize: '12px', padding: '4px 8px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {/* Breadcrumbs / Room Code (Desktop) */}
            <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '800', color: 'var(--text-main)', fontSize: '14px' }}>
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

            {/* Compact Room Name Badge for Mobile */}
            <div className="mobile-only" style={{ display: 'flex', alignItems: 'center' }}>
              <span className="neo-badge" style={{ background: 'var(--accent-periwinkle)', fontSize: '12px', padding: '4px 8px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {roomName}
              </span>
            </div>

            {/* Host Controls Button (Desktop) */}
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
                title="Host controls"
              >
                <Shield size={16} /> Host
              </button>
            )}

            {/* Teach Button (Desktop) */}
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
                <Users size={16} /> Teach
              </button>
            )}

            <div style={{ width: '3px', height: '24px', background: 'var(--border-color)', opacity: 0.5 }}></div>

            {/* Mobile Room Badge */}
            <span className="neo-badge mobile-only" style={{
              background: 'var(--accent-yellow)',
              fontSize: '11px',
              fontWeight: '900',
              padding: '4px 8px',
              maxWidth: '120px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {roomName}
            </span>
        </div>

        {/* Host Controls Button (Desktop) */}
        {isHost && (
          <div style={{ flex: 1 }} className="mobile-only"></div>

        {/* Mobile Chat Button */}
        <button
          className="desktop-only"
          onClick={onOpenHostControls}
          className="mobile-only"
          onClick={onToggleChat}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'var(--accent-pink)', color: 'var(--text-main)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--accent-purple)',
            color: 'var(--text-main)',
            border: 'var(--border-width) solid var(--border-color)',
            borderRadius: '4px',
            padding: '6px 12px',
            fontSize: '13px',
            fontWeight: '800',
            width: '32px', height: '32px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)'
            boxShadow: 'var(--shadow-sm)',
            flexShrink: 0
          }}
          title="Host controls"
          title="Open Room Chat"
        >
          <Shield size={16} /> Host
          <MessageSquare size={15} />
        </button>
      )}

        {/* Teach Button (Desktop) */}
        {canUseTeacherTools && (
          {/* Mobile Collaborators Pill */ }
          < button
          className="desktop-only"
        className="mobile-only"
        onClick={onOpenRoster}
        style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          background: 'var(--accent-blue)',
          color: '#fff',
          border: 'var(--border-width) solid var(--border-color)',
          borderRadius: '4px',
          padding: '4px 8px',
          fontSize: '11px',
          fontWeight: '900',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)',
          flexShrink: 0
        }}
        title="Online Participants"
        >
        <Users size={13} /> {orderedUsers.length}
      </button>

      {/* Mic Toggle Button */}
      <button
        onClick={onToggleMic}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'var(--accent-green)', color: 'var(--text-main)',
          background: isMicOn ? 'var(--accent-green)' : 'var(--accent-pink)',
          color: 'var(--text-main)',
          border: 'var(--border-width) solid var(--border-color)',
          borderRadius: '4px',
          padding: '6px 12px',
          fontSize: '13px',
          padding: '6px 10px',
          fontSize: '12px',
          fontWeight: '800',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)'
            boxShadow: 'var(--shadow-sm)',
          flexShrink: 0
        }}
        title="Toggle Microphone"
      >
        <Users size={16} /> Teach
        {isMicOn ? <Mic size={15} /> : <MicOff size={15} />}
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
          boxShadow: 'var(--shadow-sm)',
          flexShrink: 0
        }}
        title="Toggle Microphone"
      >
        {isMicOn ? <Mic size={16} /> : <MicOff size={16} />}
      </button>

      {/* Mobile Menu Toggle Button */}
      <button
        className="mobile-only"
        onClick={() => setShowMobileMenu(!showMobileMenu)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: showMobileMenu ? 'var(--accent-yellow)' : 'var(--surface-color)',
          border: 'var(--border-width) solid var(--border-color)',
          borderRadius: '4px',
          width: '36px', height: '36px',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)',
          flexShrink: 0
        }}
        title="More Options"
      >
        <MoreVertical size={18} />
      </button>

    </div>

    {/* Mobile Options Popover Menu */}
    {showMobileMenu && (
      <div
        className="neo-card mobile-only"
        style={{
          position: 'absolute',
          top: '64px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100vw - 32px)',
          maxWidth: '340px',
          background: 'var(--surface-color)',
          border: '3px solid #000',
          boxShadow: '6px 6px 0 #000',
          zIndex: 1001,
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <button
          onClick={() => { onOpenSettings(); setShowMobileMenu(false); }}
          className="neo-btn"
          style={{ width: '100%', background: 'var(--surface-color)', display: 'flex', alignItems: 'center', gap: '8px' }}
          {/* Mobile Menu Toggle Button */}
        <button
          className="mobile-only"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: showMobileMenu ? 'var(--accent-yellow)' : 'var(--surface-color)',
            border: 'var(--border-width) solid var(--border-color)',
            borderRadius: '4px',
            width: '32px', height: '32px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            flexShrink: 0
          }}
          title="More Options"
        >
          <Settings size={16} /> Board Settings
          <MoreVertical size={16} />
        </button>

        <button
          onClick={() => {
            navigator.clipboard.writeText(roomName);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); 
      </div>

      {/* Mobile Options Popover Menu */}
    {showMobileMenu && (
      <div
        className="neo-card mobile-only"
        style={{
          position: 'absolute',
          top: '56px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100vw - 24px)',
          maxWidth: '340px',
          background: 'var(--surface-color)',
          border: '3px solid #000',
          boxShadow: '6px 6px 0 #000',
          zIndex: 1001,
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
        className="neo-btn"
        style={{ width: '100%', background: 'var(--accent-periwinkle)', display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        {copied ? <Check size={16} color="#00a000" /> : <Copy size={16} />}
        {copied ? 'Code Copied!' : `Copy Room Code (${roomName.slice(0, 10)})`}
      </button>

        {isHost && (
          <button 
            onClick={() => { onOpenHostControls(); setShowMobileMenu(false); }}
            className="neo-btn" 
            style={{ width: '100%', background: 'var(--accent-pink)', display: 'flex', alignItems: 'center', gap: '8px' }}
          <button
            onClick={() => { onOpenSettings(); setShowMobileMenu(false); }}
            className="neo-btn"
            style={{ width: '100%', background: 'var(--surface-color)', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Shield size={16} /> Host Controls
            <Settings size={16} /> Board Settings
          </button>
    )}

    {canUseTeacherTools && (
          <button 
            onClick={() => { onOpenRoster(); setShowMobileMenu(false); }}
            className="neo-btn" 
            style={{ width: '100%', background: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '8px' }}
          <button
            onClick={() => {
              navigator.clipboard.writeText(roomName);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="neo-btn"
            style={{ width: '100%', background: 'var(--accent-periwinkle)', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Users size={16} /> Teaching Roster
            {copied ? <Check size={16} color="#00a000" /> : <Copy size={16} />}
            {copied ? 'Code Copied!' : `Copy Room Code (${roomName.slice(0, 10)})`}
          </button>
    )}
  </div >
    )}

{/* Floating Avatar Stack - Top Right */ }
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
        {
          isHost && (
            <button
              onClick={() => { onOpenHostControls(); setShowMobileMenu(false); }}
              className="neo-btn"
              style={{ width: '100%', background: 'var(--accent-pink)', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Shield size={16} /> Host Controls
            </button>
          )
        }

        {
          canUseTeacherTools && (
            <button
              onClick={() => { onOpenRoster(); setShowMobileMenu(false); }}
              className="neo-btn"
              style={{ width: '100%', background: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Users size={16} /> Teaching Roster
            </button>
          )
        }
        </div>
      )}

  {/* Floating Avatar Stack - Top Right (Desktop Only to prevent mobile header collision) */}
  <div className="desktop-only" style={{
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
          <div key="overflow" style={{
              < div key={user.id} style={{
              position: 'relative',
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'var(--surface-color)', border: '2px solid var(--border-color)',
              background: user.color || 'var(--accent-blue)', border: '2px solid var(--border-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: '900', fontSize: '13px', boxShadow: 'var(--shadow-sm)',
              marginLeft: '-8px', zIndex: 0
            }} title={`+${extraCount} more users`}>
            +{extraCount}
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
          })}
    </div>
  </div>
</div>
    </>
  );
}
