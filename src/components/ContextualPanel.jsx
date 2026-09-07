import { 
  PenTool, Highlighter, Zap, Eraser,
  Square, Circle, Triangle, Diamond, ArrowRight, Minus, AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';
import '../index.css';

const NOTE_COLORS = {
  black: { bg: '#1e1e1e', text: '#ffffff' },
  gray: { bg: '#a1a1aa', text: '#000000' },
  red: { bg: '#f87171', text: '#000000' },
  orange: { bg: '#fb923c', text: '#000000' },
  yellow: { bg: '#facc15', text: '#000000' },
  green: { bg: '#4ade80', text: '#000000' },
  blue: { bg: '#60a5fa', text: '#000000' },
  purple: { bg: '#c084fc', text: '#000000' },
};

const SHAPES = [
  { id: 'rectangle', icon: Square },
  { id: 'ellipse', icon: Circle },
  { id: 'diamond', icon: Diamond },
  { id: 'triangle', icon: Triangle },
  { id: 'arrow', icon: ArrowRight },
  { id: 'line', icon: Minus }
];

export default function ContextualPanel({ 
  activeTool, 
  selectedElements, 
  activeColor, 
  activeSize, 
  activeFont, 
  activeAlign, 
  onUpdateStyle, 
  onToolSelect 
}) {
  
  // Determine context
  const hasSelection = selectedElements && selectedElements.length > 0;
  const showDrawPanel = activeTool === 'freedraw' || activeTool === 'eraser' || activeTool === 'highlighter' || activeTool === 'laser';
  const showShapePanel = ['rectangle', 'ellipse', 'diamond', 'triangle', 'arrow', 'line'].includes(activeTool);
  const showTextPanel = activeTool === 'text' || (hasSelection && selectedElements.every(el => el.type === 'text'));

  if (!hasSelection && !showDrawPanel && !showShapePanel && !showTextPanel) {
    return null; // No contextual panel needed
  }

  const panelStyle = {
    position: 'absolute',
    right: '24px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'var(--surface-color)',
    border: 'var(--border-width) solid var(--border-color)',
    boxShadow: 'var(--shadow-md)',
    borderRadius: '8px',
    padding: '16px',
    width: '240px',
    zIndex: 1000,
    pointerEvents: 'all',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  };

  const Section = ({ title, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{title}</div>
      {children}
    </div>
  );

  const ColorPicker = () => (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
      {Object.entries(NOTE_COLORS).map(([name, { bg }]) => (
        <button
          key={name}
          onClick={() => onUpdateStyle('color', name)}
          style={{
            width: '24px', height: '24px',
            background: bg,
            border: activeColor === name ? '2px solid #000' : '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
            boxShadow: activeColor === name ? 'none' : '2px 2px 0px rgba(0,0,0,0.2)',
            transform: activeColor === name ? 'translate(2px, 2px)' : 'none'
          }}
          title={name}
        />
      ))}
    </div>
  );

  return (
    <div style={panelStyle}>
      {showDrawPanel && (
        <>
          <Section title="Draw Tools">
            <div style={{ display: 'flex', gap: '8px' }}>
              <ToolBtn icon={PenTool} active={activeTool === 'freedraw'} onClick={() => onToolSelect('freedraw')} />
              <ToolBtn icon={Highlighter} active={activeTool === 'highlighter'} onClick={() => onToolSelect('highlighter')} />
              <ToolBtn icon={Zap} active={activeTool === 'laser'} onClick={() => onToolSelect('laser')} />
              <ToolBtn icon={Eraser} active={activeTool === 'eraser'} onClick={() => onToolSelect('eraser')} />
            </div>
          </Section>
          {(activeTool === 'freedraw' || activeTool === 'highlighter') && (
            <>
              <Section title="Color"><ColorPicker /></Section>
              <Section title="Stroke Width">
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['s', 'm', 'l', 'xl'].map(size => (
                    <button key={size} onClick={() => onUpdateStyle('size', size)} style={sizeBtnStyle(activeSize === size)}>{size.toUpperCase()}</button>
                  ))}
                </div>
              </Section>
            </>
          )}
        </>
      )}

      {showShapePanel && (
        <>
          <Section title="Shape">
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {SHAPES.map(s => (
                <ToolBtn key={s.id} icon={s.icon} active={activeTool === s.id} onClick={() => onToolSelect(s.id)} />
              ))}
            </div>
          </Section>
          <Section title="Stroke"><ColorPicker /></Section>
        </>
      )}

      {showTextPanel && (
        <>
          <Section title="Text Color"><ColorPicker /></Section>
          <Section title="Font Family">
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => onUpdateStyle('font', 'sans')} style={fontBtnStyle(activeFont === 'sans', 'sans-serif')}>Sans</button>
              <button onClick={() => onUpdateStyle('font', 'serif')} style={fontBtnStyle(activeFont === 'serif', 'serif')}>Serif</button>
              <button onClick={() => onUpdateStyle('font', 'mono')} style={fontBtnStyle(activeFont === 'mono', 'monospace')}>Mono</button>
            </div>
          </Section>
          <Section title="Alignment">
            <div style={{ display: 'flex', gap: '8px' }}>
              <ToolBtn icon={AlignLeft} active={activeAlign === 'start'} onClick={() => onUpdateStyle('align', 'start')} />
              <ToolBtn icon={AlignCenter} active={activeAlign === 'middle'} onClick={() => onUpdateStyle('align', 'middle')} />
              <ToolBtn icon={AlignRight} active={activeAlign === 'end'} onClick={() => onUpdateStyle('align', 'end')} />
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

const ToolBtn = ({ icon: Icon, active, onClick }) => (
  <button onClick={onClick} style={{
    width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: active ? 'var(--text-main)' : 'var(--surface-color)',
    color: active ? 'var(--surface-color)' : 'var(--text-main)',
    border: '2px solid var(--border-color)',
    borderRadius: '4px', cursor: 'pointer',
    boxShadow: active ? 'none' : '2px 2px 0px var(--shadow-color)',
    transform: active ? 'translate(2px, 2px)' : 'none'
  }}>
    <Icon size={16} />
  </button>
);

const sizeBtnStyle = (active) => ({
  flex: 1, padding: '4px', fontSize: '12px', fontWeight: '800',
  background: active ? 'var(--text-main)' : 'var(--surface-color)',
  color: active ? 'var(--surface-color)' : 'var(--text-main)',
  border: '2px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer',
  boxShadow: active ? 'none' : '2px 2px 0px var(--shadow-color)',
  transform: active ? 'translate(2px, 2px)' : 'none'
});

const fontBtnStyle = (active, family) => ({
  flex: 1, padding: '4px', fontSize: '12px', fontFamily: family,
  background: active ? 'var(--text-main)' : 'var(--surface-color)',
  color: active ? 'var(--surface-color)' : 'var(--text-main)',
  border: '2px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer',
  boxShadow: active ? 'none' : '2px 2px 0px var(--shadow-color)',
  transform: active ? 'translate(2px, 2px)' : 'none'
});
