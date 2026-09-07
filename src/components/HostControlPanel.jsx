import { sendHostAction } from '../lib/hostControl';
import '../index.css';

export default function HostControlPanel({ provider, localClientId, onClose, perms = {}, setPerms = () => {}, hostLocked = false, setHostLocked = () => {}, editor }) {
  const toggles = {
    mic: perms?.mic ?? true,
    draw: !hostLocked,
    share: perms?.share ?? true,
    files: perms?.files ?? true,
    copyPaste: perms?.copyPaste !== false
  };

  const act = (payload) => sendHostAction(provider, payload);

  const handleToggle = (key, onCmd, offCmd) => {
    const newState = !toggles[key];
    act({ cmd: newState ? onCmd : offCmd, target: 'all' });
    
    // Optimistically update local state so the host's toggles flip immediately
    if (key === 'mic') setPerms(p => ({ ...p, mic: newState }));
    if (key === 'share') setPerms(p => ({ ...p, share: newState }));
    if (key === 'files') setPerms(p => ({ ...p, files: newState }));
    if (key === 'copyPaste') setPerms(p => ({ ...p, copyPaste: newState }));
    if (key === 'draw') setHostLocked(!newState);
  };

  const handleBringAllToMe = () => {
    if (!editor) return;
    const camera = editor.getCamera();
    act({ cmd: 'bringAllToMe', target: 'all', x: camera.x, y: camera.y, z: camera.z });
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99999, pointerEvents: 'auto' }}>
      <div className="neo-window" onClick={e => e.stopPropagation()} style={{ 
        width: '400px', 
        display: 'flex', 
        flexDirection: 'column',
        position: 'absolute',
        top: '56px',
        left: '140px'
      }}>
        <div className="neo-window-header" style={{ background: 'var(--accent-pink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={16} />
          <span style={{ fontWeight: '900', textTransform: 'uppercase', flex: 1 }}>Host Controls</span>
          <button className="neo-btn" onClick={onClose} style={{ padding: '2px 8px', background: 'var(--surface-color)' }}><X size={14} /></button>
        </div>

        <div className="neo-window-content" style={{ padding: '20px', background: 'var(--bg-color)', gap: '16px', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
            Global Permissions
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Mic */}
            <div 
              className={`neo-toggle ${toggles.mic ? 'on' : ''}`}
              onClick={() => handleToggle('mic', 'allowMic', 'blockMic')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {toggles.mic ? <Mic size={16} /> : <MicOff size={16} />} 
                <span>Allow Microphones</span>
              </div>
              <div className="neo-toggle-track"><div className="neo-toggle-thumb" /></div>
            </div>

            {/* Whiteboard */}
            <div 
              className={`neo-toggle ${toggles.draw ? 'on' : ''}`}
              onClick={() => handleToggle('draw', 'unlock', 'lock')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {toggles.draw ? <Pencil size={16} /> : <PencilOff size={16} />} 
                <span>Allow Drawing</span>
              </div>
              <div className="neo-toggle-track"><div className="neo-toggle-thumb" /></div>
            </div>

            {/* Screen Share */}
            <div 
              className={`neo-toggle ${toggles.share ? 'on' : ''}`}
              onClick={() => handleToggle('share', 'allowShare', 'blockShare')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {toggles.share ? <MonitorUp size={16} /> : <MonitorOff size={16} />} 
                <span>Allow Screen Share</span>
              </div>
              <div className="neo-toggle-track"><div className="neo-toggle-thumb" /></div>
            </div>

            {/* File Access */}
            <div 
              className={`neo-toggle ${toggles.files ? 'on' : ''}`}
              onClick={() => handleToggle('files', 'allowFiles', 'blockFiles')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {toggles.files ? <FileCode size={16} /> : <FileX size={16} />} 
                <span>Allow File Uploads</span>
              </div>
              <div className="neo-toggle-track"><div className="neo-toggle-thumb" /></div>
            </div>

            {/* Copy/Paste Access */}
            <div 
              className={`neo-toggle ${toggles.copyPaste ? 'on' : ''}`}
              onClick={() => handleToggle('copyPaste', 'allowCopyPaste', 'blockCopyPaste')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {toggles.copyPaste ? <Unlock size={16} /> : <Lock size={16} />} 
                <span>Allow Copy & Paste</span>
              </div>
              <div className="neo-toggle-track"><div className="neo-toggle-thumb" /></div>
            </div>
          </div>

          <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginTop: '12px' }}>
            Actions
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button className="neo-btn" style={{ padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={handleBringAllToMe}>
              <Crosshair size={14} /> Bring All To Me
            </button>
            <button className="neo-btn" style={{ padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'var(--accent-pink)' }} onClick={() => {
              if (window.confirm("Are you sure you want to clear the entire board for everyone?")) {
                if (editor) {
                  const allShapes = editor.getCurrentPageShapes();
                  const unlockedShapes = allShapes.filter(s => !s.isLocked);
                  editor.deleteShapes(unlockedShapes.map(s => s.id));
                }
                act({ cmd: 'clearBoard', target: 'all' });
              }
            }}>
              <Trash2 size={14} /> Clear Board
            </button>
          </div>

          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic', lineHeight: '1.4' }}>
            Note: You can manage individual participant permissions by clicking on their avatar in the title bar.
          </div>
        </div>
      </div>
    </div>
  );
}
