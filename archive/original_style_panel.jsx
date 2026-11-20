import React from 'react';
import { NOTE_COLORS } from '../shapes/ShapeColors';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

export default function StylePanel({ 
  activeColor, 
  setActiveColor, 
  activeSize, 
  setActiveSize,
  activeFill = 'none',
  setActiveFill = () => {},
  activeDash = 'draw',
  setActiveDash = () => {},
  activeFont = 'draw',
  setActiveFont = () => {},
  activeAlign = 'middle',
  setActiveAlign = () => {}
}) {
  const panelStyle = {
    position: 'absolute',
    right: '24px',
    top: '24px',
    background: 'var(--sidebar-bg)',
    backdropFilter: 'none',
    border: '4px solid var(--border-color)',
    borderRadius: '0',
    boxShadow: '6px 6px 0px var(--shadow-color)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    width: '180px',
    pointerEvents: 'all',
    zIndex: 1000,
    color: '#000'
  };

  const sectionHeaderStyle = {
    fontSize: '12px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#a1a1aa',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  };

  const btnStyle = (isActive) => ({
    flex: '1 0 40%',
    padding: '6px',
    background: isActive ? 'var(--accent-yellow)' : 'var(--sidebar-bg, #fff)',
    border: '3px solid var(--border-color)',
    color: '#000',
    borderRadius: '0',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: isActive ? '0px 0px 0px var(--shadow-color)' : '3px 3px 0px var(--shadow-color)',
    transform: isActive ? 'translate(3px, 3px)' : 'none',
    transition: 'all 0.1s'
  });

  return (
    <div style={panelStyle}>
      <div style={{ fontWeight: '800', fontSize: '14px', borderBottom: '4px solid var(--border-color)', paddingBottom: '8px', color: 'var(--text-main)', textTransform: 'uppercase' }}>
        Style Properties
      </div>

      {/* Colors */}
      <div>
        <div style={sectionHeaderStyle}>Color</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {Object.entries(NOTE_COLORS).map(([colorName, colorValues]) => (
            <button
              key={colorName}
              onClick={() => setActiveColor(colorName)}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '0',
                background: colorValues.bg,
                border: activeColor === colorName ? '4px solid var(--border-color)' : '2px solid var(--border-color)',
                cursor: 'pointer',
                boxShadow: activeColor === colorName ? '0px 0px 0px var(--shadow-color)' : '3px 3px 0px var(--shadow-color)',
                transform: activeColor === colorName ? 'translate(3px, 3px)' : 'none',
                transition: 'all 0.1s'
              }}
              title={colorName}
            />
          ))}
        </div>
      </div>

      {/* Fill */}
      <div>
        <div style={sectionHeaderStyle}>Fill</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['none', 'semi', 'solid', 'pattern'].map((fill) => (
            <button key={fill} onClick={() => setActiveFill(fill)} style={btnStyle(activeFill === fill)}>
              {fill}
            </button>
          ))}
        </div>
      </div>

      {/* Dash */}
      <div>
        <div style={sectionHeaderStyle}>Dash</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['draw', 'solid', 'dashed', 'dotted'].map((dash) => (
            <button key={dash} onClick={() => setActiveDash(dash)} style={btnStyle(activeDash === dash)}>
              {dash}
            </button>
          ))}
        </div>
      </div>

      {/* Sizes */}
      <div>
        <div style={{ ...sectionHeaderStyle, display: 'flex', justifyContent: 'space-between' }}>
          <span>Size</span>
          <span style={{ color: '#00ffcc' }}>{(activeSize || 'M').toUpperCase()}</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="3" 
          step="1"
          value={['s', 'm', 'l', 'xl'].indexOf((activeSize || 'm').toLowerCase()) >= 0 ? ['s', 'm', 'l', 'xl'].indexOf((activeSize || 'm').toLowerCase()) : 1}
          onChange={(e) => setActiveSize(['s', 'm', 'l', 'xl'][e.target.value])}
          style={{ width: '100%', cursor: 'pointer', accentColor: '#00ffcc' }}
        />
      </div>

      {/* Font */}
      <div>
        <div style={sectionHeaderStyle}>Font</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['draw', 'sans', 'serif', 'mono'].map((font) => (
            <button key={font} onClick={() => setActiveFont(font)} style={btnStyle(activeFont === font)}>
              {font}
            </button>
          ))}
        </div>
      </div>

      {/* Align */}
      <div>
        <div style={sectionHeaderStyle}>Align</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { id: 'start', icon: <AlignLeft size={16} /> },
            { id: 'middle', icon: <AlignCenter size={16} /> },
            { id: 'end', icon: <AlignRight size={16} /> }
          ].map((align) => (
            <button key={align.id} onClick={() => setActiveAlign(align.id)} style={{...btnStyle(activeAlign === align.id), flex: 1, display: 'flex', justifyContent: 'center'}} title={align.id}>
              {align.icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
