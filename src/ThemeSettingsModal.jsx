import React from 'react';
import './index.css';

const ACCENTS = [
  { id: 'periwinkle', hex: '#92a9e1', hover: '#92a9e1' },
  { id: 'emerald', hex: '#77ff33', hover: '#77ff33' },
  { id: 'macha', hex: '#fca311', hover: '#fca311' },
  { id: 'rose', hex: '#d7263d', hover: '#d7263d' },
  { id: 'amber', hex: '#ff3203', hover: '#ff3203' },
  { id: 'cyan', hex: '#00c0fe', hover: '#00c0fe' },
];

export default function ThemeSettingsModal({
  onClose,
  mode, setMode,
  accentColor, setAccentColor,
  isHost, editor
}) {
  const [displayName, setDisplayName] = React.useState(() => localStorage.getItem('userName') || 'Anonymous');

  const handleNameChange = (e) => {
    const newName = e.target.value;
    setDisplayName(newName);
    localStorage.setItem('userName', newName || 'Anonymous');
    window.dispatchEvent(new CustomEvent('profile-updated', { detail: newName || 'Anonymous' }));
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000, position: 'fixed', inset: 0 }}>
      <div
        className="neo-window"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '500px',
          maxWidth: '90vw'
        }}
      >
        <div className="neo-window-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="neo-window-dot red"></div>
            <div className="neo-window-dot yellow"></div>
            <div className="neo-window-dot green"></div>
            <span style={{ fontWeight: '900', textTransform: 'uppercase', marginLeft: '12px', fontSize: '16px' }}>Theme Settings</span>
          </div>
          <button className="neo-btn" onClick={onClose} style={{ padding: '4px', background: 'var(--bg-color)', color: 'var(--text-main)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="neo-window-content" style={{ padding: '24px', background: 'var(--sidebar-bg)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Profile Settings */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Display Name
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} color="var(--text-main)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={displayName}
                onChange={handleNameChange}
                placeholder="Your name..."
                className="neo-input"
                style={{ width: '100%', padding: '12px 12px 12px 40px' }}
              />
            </div>
          </div>

          <div style={{ height: '3px', background: 'var(--border-color)', width: '100%' }}></div>

          {/* Mode Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Color Mode
            </label>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button
                onClick={() => setMode('light')}
                className="neo-btn"
                style={{
                  flex: 1, 
                  background: mode === 'light' ? 'var(--accent-yellow)' : 'var(--bg-color)',
                  boxShadow: mode === 'light' ? '2px 2px 0px var(--shadow-color)' : '4px 4px 0px var(--shadow-color)',
                  transform: mode === 'light' ? 'translate(2px, 2px)' : 'none',
                  color: mode === 'light' ? '#000' : 'var(--text-main)'
                }}
              >
                Light
              </button>
              <button
                onClick={() => setMode('dark')}
                className="neo-btn"
                style={{
                  flex: 1, 
                  background: mode === 'dark' ? 'var(--accent-yellow)' : 'var(--bg-color)',
                  boxShadow: mode === 'dark' ? '2px 2px 0px var(--shadow-color)' : '4px 4px 0px var(--shadow-color)',
                  transform: mode === 'dark' ? 'translate(2px, 2px)' : 'none',
                  color: mode === 'dark' ? '#000' : 'var(--text-main)'
                }}
              >
                Dark
              </button>
            </div>
          </div>

          {/* Accent Color Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '12px', textTransform: 'uppercase' }}>
              Accent Color
            </label>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {ACCENTS.map(accent => (
                <button
                  key={accent.id}
                  onClick={() => setAccentColor(accent)}
                  style={{
                    width: '40px', height: '40px', background: accent.hex,
                    border: '3px solid var(--border-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '2px 2px 0px var(--shadow-color)',
                    outline: accentColor.hex === accent.hex ? '3px solid var(--border-color)' : 'none',
                    outlineOffset: '2px'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Host Controls */}
          {isHost && editor && (
            <>
              <div style={{ height: '3px', background: 'var(--border-color)', width: '100%' }}></div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '900', color: '#ef4444', marginBottom: '12px', textTransform: 'uppercase' }}>
                  Host Danger Zone
                </label>
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to completely clear the whiteboard for everyone? This cannot be undone!")) {
                      const allShapeIds = Array.from(editor.getCurrentPageShapeIds());
                      editor.deleteShapes(allShapeIds);
                      onClose();
                    }
                  }}
                  className="neo-btn"
                  style={{
                    width: '100%', padding: '16px',
                    background: 'var(--accent-orange)', color: '#000',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                  <Trash2 size={18} /> Clear Whiteboard
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
