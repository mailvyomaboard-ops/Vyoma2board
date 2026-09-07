import { useState } from 'react';

export default function ConfirmDeleteRoomModal({ room, onConfirm, onCancel }) {
  const [typed, setTyped] = useState('');
  const matches = typed.trim() === (room?.name || '');

  return (
    <div className="modal-overlay" onClick={onCancel} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
      <div className="neo-window" onClick={e => e.stopPropagation()} style={{ width: '460px' }}>
        <div className="neo-window-header" style={{ background: 'var(--accent-pink)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: '900', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}><Trash2 size={16} /> Delete Room</span>
          <button onClick={onCancel} style={{ background: 'var(--surface-color)', border: '2px solid #000', cursor: 'pointer', padding: '2px' }}><X size={16} /></button>
        </div>
        <div className="neo-window-content" style={{ padding: '16px', background: 'var(--surface-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '14px', fontWeight: '700', margin: 0 }}>
            This will <strong>permanently delete</strong> "{room?.name}" and all of its content for everyone.
          </p>
          <p style={{ fontSize: '13px', fontWeight: '600', margin: 0 }}>
            Type the room name to confirm:
          </p>
          <input
            type="text"
            className="neo-input"
            autoFocus
            placeholder={room?.name}
            value={typed}
            onChange={e => setTyped(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && matches) onConfirm(); }}
          />
          {!matches && typed.trim() && (
            <span className="neo-badge" style={{ background: '#FFB7B2', fontSize: '12px' }}>Name does not match</span>
          )}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button className="neo-btn" onClick={onCancel} style={{ background: 'var(--surface-color)' }}>Cancel</button>
            <button className="neo-btn" onClick={onConfirm} disabled={!matches} style={{ background: 'var(--accent-pink)', opacity: matches ? 1 : 0.5 }}>
              <Trash2 size={14} /> Permanently Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
