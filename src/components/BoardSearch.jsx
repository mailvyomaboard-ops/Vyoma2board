import { useState, useMemo, useRef, useEffect } from 'react';
import { FileText, FolderOpen, LayoutGrid, ClipboardList, Type } from 'lucide-react';
import '../index.css';

const ICONS = { 'milanote-file': FileText, 'milanote-folder': FolderOpen, 'milanote-board': LayoutGrid, 'exam-file': ClipboardList, 'milanote-card': Type };

function shapeName(shape) {
  const p = shape?.props || {};
  return p.name || p.text || p.label || '';
}

function shapeType(shape) {
  return shape?.type || '';
}

export default function BoardSearch({ editor, provider }) {
  const [mode, setMode] = useState('files'); // 'files' | 'users'
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!provider || !provider.awareness) return;
    const update = () => {
      const states = provider.awareness.getStates();
      const list = [];
      states.forEach((state) => {
        if (state?.presence) {
          list.push({
            name: state.presence.userName || 'User',
            authUserId: state.authUserId,
            color: state.presence.color || '#FFDE59',
            basePoint: state.basePoint
          });
        }
      });
      setUsers(list);
    };
    update();
    provider.awareness.on('update', update);
    return () => provider.awareness.off('update', update);
  }, [provider]);

  const files = useMemo(() => {
    if (!editor || mode !== 'files') return [];
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return editor.getCurrentPageShapes()
      .filter(s => shapeName(s).toLowerCase().includes(q))
      .slice(0, 12);
  }, [editor, mode, query]);

  const userMatches = useMemo(() => {
    if (mode !== 'users') return [];
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return users.filter(u => (u.name || '').toLowerCase().includes(q)).slice(0, 12);
  }, [mode, query, users]);

  const goToFile = (shape) => {
    try {
      if (editor.select) editor.select(shape.id);
      
      if (editor.zoomToSelection) {
        editor.zoomToSelection({ animation: { duration: 300 } });
      } else {
        const bounds = editor.getShapePageBounds(shape.id);
        if (bounds && editor.zoomToBounds) {
          editor.zoomToBounds(bounds, { animation: { duration: 300 } });
        }
      }
    } catch (e) {
      console.warn('Failed to zoom to shape', e);
    }
    setOpen(false);
    setQuery('');
  };

  const goToUser = (u) => {
    if (u.basePoint) {
      try {
        if (editor.setCamera) {
          editor.setCamera({ x: u.basePoint.x, y: u.basePoint.y, z: 1 }, { animation: { duration: 500 } });
        } else if (editor.pan) {
          const camera = editor.getCamera();
          editor.pan({ x: -(u.basePoint.x - camera.x || 0), y: -(u.basePoint.y - camera.y || 0) });
        }
      } catch (e) {
        console.warn('Failed to go to user base', e);
      }
    }
    setOpen(false);
    setQuery('');
  };

  return (
    <div style={{ position: 'relative', zIndex: 1500, width: '200px' }}>
      {!open ? (
        <button
          className="neo-btn"
          onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--accent-blue)', fontSize: '13px', padding: '6px 12px', width: '100%', justifyContent: 'center' }}
        >
          <Search size={16} /> Search
        </button>
      ) : (
        <div className="neo-window" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', width: '300px', display: 'flex', flexDirection: 'column' }}>
          <div className="neo-window-header" style={{ background: 'var(--accent-blue)', padding: '6px 10px' }}>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                className="neo-btn"
                style={{ background: mode === 'files' ? 'var(--accent-yellow)' : 'var(--surface-color)', padding: '2px 10px', fontSize: '12px' }}
                onClick={() => setMode('files')}
              ><FileText size={12} /> Files</button>
              <button
                className="neo-btn"
                style={{ background: mode === 'users' ? 'var(--accent-yellow)' : 'var(--surface-color)', padding: '2px 10px', fontSize: '12px' }}
                onClick={() => setMode('users')}
              ><Users size={12} /> Users</button>
              <button className="neo-btn" style={{ marginLeft: 'auto', background: 'var(--surface-color)', padding: '2px' }} onClick={() => { setOpen(false); setQuery(''); }}><X size={12} /></button>
            </div>
          </div>
          <div className="neo-window-content" style={{ padding: '8px', background: 'var(--surface-color)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 8, top: 9, color: '#555' }} />
              <input
                ref={inputRef}
                className="neo-input"
                style={{ width: '100%', padding: '6px 8px 6px 30px', fontSize: '13px' }}
                placeholder={mode === 'files' ? 'Search files, folders, exams...' : 'Search people...'}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') { setOpen(false); setQuery(''); }
                  if (e.key === 'Enter') {
                    if (mode === 'files' && files.length) goToFile(files[0]);
                    if (mode === 'users' && userMatches.length) goToUser(userMatches[0]);
                  }
                }}
              />
            </div>

            {mode === 'files' && (files.length === 0 ? (
              query.trim() && <span style={{ fontSize: '12px', fontWeight: '700', color: '#555' }}>No matching items.</span>
            ) : (
              files.map(s => {
                const Icon = ICONS[shapeType(s)] || Type;
                return (
                  <button key={s.id} className="neo-btn" onClick={() => goToFile(s)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left', background: 'var(--surface-color)', fontSize: '13px', padding: '6px 8px' }}>
                    <Icon size={14} /> <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shapeName(s) || shapeType(s)}</span>
                    <MapPin size={12} />
                  </button>
                );
              })
            ))}

            {mode === 'users' && (userMatches.length === 0 ? (
              query.trim() && <span style={{ fontSize: '12px', fontWeight: '700', color: '#555' }}>No matching users.</span>
            ) : (
              userMatches.map((u, i) => (
                <button key={i} className="neo-btn" onClick={() => goToUser(u)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left', background: 'var(--surface-color)', fontSize: '13px', padding: '6px 8px' }}>
                  <span style={{ width: '22px', height: '22px', border: '2px solid #000', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '11px' }}>
                    {u.name[0]?.toUpperCase()}
                  </span>
                  <span style={{ flex: 1 }}>{u.name}</span>
                  <MapPin size={12} />
                </button>
              ))
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
