import { useState, useRef } from 'react';
import { useCallContext } from '../context/CallContext';

function DraggableWindow({ user, onUnpin, isMicMuted, isVideoOff }) {
  const [position, setPosition] = useState({ x: window.innerWidth - 320, y: 40 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);

  const handlePointerDown = (e) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: position.x,
      initY: position.y
    };
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPosition({
      x: dragRef.current.initX + dx,
      y: dragRef.current.initY + dy
    });
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    e.target.releasePointerCapture(e.pointerId);
  };

  return (
    <div 
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: '280px',
        height: '160px',
        background: '#1e1f22',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
        zIndex: 100,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px solid #2b2d31',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {user.stream && (user.isLocal ? !isVideoOff : true) ? (
        <video 
          autoPlay 
          playsInline 
          muted={user.isLocal}
          ref={el => { if (el && user.stream && el.srcObject !== user.stream) el.srcObject = user.stream; }}
          onLoadedMetadata={e => e.target.play()}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: user.isLocal && user.mode !== 'screen' ? 'scaleX(-1)' : 'none' }}
        />
      ) : (
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: user.color || '#5865F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', color: 'white' }}>
          {user.name[0]}
        </div>
      )}
       
      <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '8px', color: 'white', fontSize: '11px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
         {user.name} <Pin size={10} />
      </div>

      <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
         <button 
           onPointerDown={e => e.stopPropagation()} 
           onClick={() => onUnpin(user.id)} 
           style={{ background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
         >
           <Pin size={12} style={{ transform: 'rotate(45deg)' }} />
         </button>
      </div>
    </div>
  );
}

export default function CallManager({ isCallHidden, roomInfo }) {
  const { callUsers, callMode, isMicMuted, setIsMicMuted, isVideoOff, setIsVideoOff, toggleScreenShare, leaveCall, setIsCallHidden } = useCallContext();
  const [pinnedUserIds, setPinnedUserIds] = useState([]);
  const [showChat, setShowChat] = useState(false);

  const togglePin = (userId) => {
    if (pinnedUserIds.includes(userId)) {
      setPinnedUserIds(pinnedUserIds.filter(id => id !== userId));
    } else {
      setPinnedUserIds([...pinnedUserIds, userId]);
    }
  };

  const pinnedUsers = callUsers.filter(u => pinnedUserIds.includes(u.id));
  
  // For screen share mode, prioritize the screen feed
  const screenFeeds = callUsers.filter(u => u.mode === 'screen');
  const videoFeeds = callUsers.filter(u => u.mode !== 'screen');

  return (
    <>
      {!isCallHidden && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: '#1e1f22', zIndex: 90, display: 'flex', flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
             <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}><Users size={24} /> {callMode === 'screen' ? 'Screen Share Lobby' : 'Voice & Video Channel'}</h2>
          </div>

          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
          {/* Grid Layout based on mode */}
          {callMode === 'screen' && screenFeeds.length > 0 ? (
            <div style={{ flex: 1, display: 'flex', gap: '16px', overflow: 'hidden' }}>
              <div style={{ flex: 3, background: '#000', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
                 <video 
                    autoPlay playsInline muted={screenFeeds[0].isLocal}
                    ref={el => { if (el && screenFeeds[0].stream && el.srcObject !== screenFeeds[0].stream) el.srcObject = screenFeeds[0].stream; }}
                    onLoadedMetadata={e => e.target.play()}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                  <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(0,0,0,0.8)', padding: '8px 16px', borderRadius: '12px', color: 'white', fontWeight: 'bold' }}>
                    {screenFeeds[0].name}'s Screen
                  </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
                {videoFeeds.map(user => (
                   <div key={user.id} style={{ background: '#2b2d31', borderRadius: '12px', overflow: 'hidden', minHeight: '150px', position: 'relative' }}>
                     {user.stream && (user.isLocal ? !isVideoOff : true) ? (
                        <video autoPlay playsInline muted={user.isLocal} ref={el => { if (el && user.stream && el.srcObject !== user.stream) el.srcObject = user.stream; }} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: user.isLocal ? 'scaleX(-1)' : 'none' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: user.color, fontSize: '24px', color: 'white', fontWeight: 'bold' }}>{user.name[0]}</div>
                      )}
                      <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '8px', color: 'white', fontSize: '12px' }}>
                        {user.name} {user.isLocal && '(You)'}
                      </div>
                   </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', overflowY: 'auto' }}>
              {callUsers.map(user => {
                const isPinned = pinnedUserIds.includes(user.id);
                return (
                  <div key={user.id} style={{
                    background: '#2b2d31', borderRadius: '16px', position: 'relative', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '250px',
                    border: isPinned ? '2px solid #23a559' : '2px solid transparent'
                  }}>
                    {user.stream && (user.isLocal ? !isVideoOff : true) ? (
                      <video 
                        autoPlay 
                        playsInline 
                        muted={user.isLocal}
                        ref={el => { if (el && user.stream && el.srcObject !== user.stream) el.srcObject = user.stream; }}
                        onLoadedMetadata={e => e.target.play()}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: user.isLocal && user.mode !== 'screen' ? 'scaleX(-1)' : 'none' }}
                      />
                    ) : (
                      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: user.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', color: 'white' }}>
                        {user.name[0]}
                      </div>
                    )}
                    
                    <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(0,0,0,0.6)', padding: '4px 12px', borderRadius: '12px', color: 'white', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {user.name} {user.isLocal && '(You)'}
                      {user.isLocal && isMicMuted && <MicOff size={12} color="#da373c" />}
                    </div>
                    
                    <button 
                      onClick={() => togglePin(user.id)}
                      style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.6)', color: isPinned ? '#23a559' : 'white', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', transition: '0.2s' }}
                      title="Pin this user"
                    >
                      <Pin size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          </div>
          {showChat && (
            <div style={{ width: '340px', background: '#2b2d31', borderLeft: '2px solid #1e1f22', position: 'relative' }}>
              <ChatPanel onClose={() => setShowChat(false)} roomInfo={roomInfo} />
            </div>
          )}
          </div>
          
          {/* Bottom Toolbar */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            padding: '16px',
            background: 'rgba(30, 31, 34, 0.85)',
            backdropFilter: 'none',
            borderTop: '1px solid #2b2d31',
            zIndex: 1000
          }}>
            <button 
              onClick={() => setIsMicMuted(!isMicMuted)} 
              style={{ width: '48px', height: '48px', borderRadius: '50%', background: isMicMuted ? '#da373c' : '#2b2d31', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.1s' }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {isMicMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            
            <button 
              onClick={() => setIsVideoOff(!isVideoOff)} 
              style={{ width: '48px', height: '48px', borderRadius: '50%', background: isVideoOff ? '#da373c' : '#2b2d31', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.1s' }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
            </button>

            <button 
              onClick={toggleScreenShare} 
              style={{ width: '48px', height: '48px', borderRadius: '50%', background: callMode === 'screen' ? '#23a559' : '#2b2d31', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.1s' }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <MonitorUp size={24} />
            </button>
            
            <button 
              onClick={() => setShowChat(!showChat)} 
              style={{ width: '48px', height: '48px', borderRadius: '50%', background: showChat ? '#5865F2' : '#2b2d31', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.1s' }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <MessageSquare size={24} />
            </button>
            
            <button 
              onClick={() => setIsCallHidden(!isCallHidden)} 
              style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#2b2d31', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', transition: 'transform 0.1s' }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              Hide
            </button>
            
            <button 
              onClick={() => { leaveCall(); setIsCallHidden(false); }} 
              style={{ width: '64px', height: '48px', borderRadius: '24px', background: '#da373c', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.1s' }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Phone size={24} style={{ transform: 'rotate(135deg)' }} />
            </button>
          </div>
        </div>
      )}

      {isCallHidden && pinnedUsers.map(user => (
        <DraggableWindow 
          key={user.id} 
          user={user} 
          onUnpin={togglePin} 
          isMicMuted={isMicMuted}
          isVideoOff={isVideoOff}
        />
      ))}
    </>
  );
}
