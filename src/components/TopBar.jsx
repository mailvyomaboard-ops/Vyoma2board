import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Layout, Settings, Users, MessageSquare } from 'lucide-react';
import { isTeacherRole } from '../lib/classMeta';
import '../index.css';

export default function TopBar({ 
  roomName, 
  roomInfo, 
  localUserId, 
  actingHost, 
  onOpenHostControls, 
  onOpenRoster, 
  onToggleChat 
}) {
  const navigate = useNavigate();
  const [breadcrumbs, setBreadcrumbs] = useState([]);

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

  return (
    <div style={{
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

      <div style={{ width: '3px', height: '24px', background: 'var(--border-color)', opacity: 0.5 }}></div>

      {/* Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '800', color: 'var(--text-main)', fontSize: '14px' }}>
        {breadcrumbs.length > 0 ? (
          breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.id}>
              <span 
                onClick={() => navigate(`/board/${crumb.id}`)}
                style={{ cursor: 'pointer', textDecoration: idx === breadcrumbs.length - 1 ? 'none' : 'underline' }}
              >
                {crumb.name}
              </span>
              {idx < breadcrumbs.length - 1 && <span>/</span>}
            </React.Fragment>
          ))
        ) : (
          `Board`
        )}
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

      {/* Roster Button */}
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
          <Users size={16} /> Roster
        </button>
      )}

      {/* Chat Button */}
      <button
        onClick={onToggleChat}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'var(--accent-blue)', color: 'var(--text-main)',
          border: 'var(--border-width) solid var(--border-color)',
          borderRadius: '4px',
          padding: '6px 12px',
          fontSize: '13px',
          fontWeight: '800',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <MessageSquare size={16} /> Chat
      </button>

    </div>
  );
}
