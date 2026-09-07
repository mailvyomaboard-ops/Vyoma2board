import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import '../index.css';
import { isTeacherCreatedRoom, isAssignedTeacher } from '../lib/classMeta';
import { loadRoomHistory, saveRoomHistory, addRoomToHistory } from '../lib/roomHistory';

export default function Dashboard() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [userRole, setUserRole] = useState('Casual');
  const [roomCode, setRoomCode] = useState('');
  const [roomHistory, setRoomHistory] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [userId, setUserId] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem('userName');
    const token = localStorage.getItem('token');
    const savedRole = localStorage.getItem('userRole') || 'Casual';
    if (!savedName || !token) {
      navigate('/auth');
    } else {
      setDisplayName(savedName);
      setUserRole(savedRole);
    }

    let savedHistory = loadRoomHistory();
    setRoomHistory(savedHistory);

    let savedUserId = localStorage.getItem('userId');
    if (!savedUserId) {
      savedUserId = 'user-' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('userId', savedUserId);
    }
    setUserId(savedUserId);
  }, [navigate]);

  const saveToHistory = (id, name, parentId = null, kind = 'board') => {
    const newHistory = addRoomToHistory(id, name, parentId, kind);
    setRoomHistory(newHistory);
  };

  const handleCreateBoard = async () => {
    try {
      let finalName = newRoomName.trim();
      if (!finalName) {
        const untitledCount = roomHistory.filter(r => !r.parentId && r.name.startsWith('New Board')).length;
        finalName = untitledCount === 0 ? 'New Board' : `New Board ${untitledCount}`;
      }

      const newRoomId = Math.random().toString(36).substring(2, 8) + '-' + Math.random().toString(36).substring(2, 8);
      const roomRef = doc(db, 'rooms', newRoomId);

      await setDoc(roomRef, {
        name: finalName,
        kind: 'board',
        hostId: userId,
        hostName: displayName,
        createdBy: userId,
        createdByRole: userRole,
        roles: { [userId]: 'admin' },
        createdAt: serverTimestamp(),
        parentId: null // Root level board
      });

      const newRoomData = { id: newRoomId, name: finalName, hostId: userId, parentId: null, kind: 'board' };
      let current = loadRoomHistory();
      const updatedHistory = [newRoomData, ...current];
      saveRoomHistory(updatedHistory);
      setRoomHistory(updatedHistory);
      setNewRoomName('');

      // Open the new board directly in the whiteboard
      navigate(`/board/${newRoomId}`);
    } catch (e) {
      alert('Error creating board: ' + e.message);
    }
  };

const leaveRoom = (room) => {
    const newHistory = roomHistory.filter(r => r.id !== room.id);
    setRoomHistory(newHistory);
    saveRoomHistory(newHistory);
  };

  const handleDeleteRoom = async (room, e) => {
    e.stopPropagation();
    if (room.hostId !== userId) {
      // Not the creator as far as local history knows — check the real room doc.
      try {
        const snap = await getDoc(doc(db, 'rooms', room.id));
        const data = snap.exists() ? snap.data() : null;
        if (data && isTeacherCreatedRoom(data) && isAssignedTeacher(data, userId)) {
          setConfirmDelete({ id: room.id, ...data });
          return;
        }
        if (data && data.hostId === userId && !isTeacherCreatedRoom(data)) {
          if (window.confirm(`You are the host of ${room.name}. This will permanently delete the room for everyone. Are you sure?`)) {
            await deleteDoc(doc(db, 'rooms', room.id));
          } else {
            return;
          }
        }
      } catch (err) {
        console.warn('Could not verify room, leaving only', err);
      }
      leaveRoom(room);
      return;
    }

    // Local history says we are the host. Verify against Firestore.
    try {
      const snap = await getDoc(doc(db, 'rooms', room.id));
      const data = snap.exists() ? snap.data() : null;
      if (data && isTeacherCreatedRoom(data)) {
        if (isAssignedTeacher(data, userId)) {
          setConfirmDelete({ id: room.id, ...data });
        } else {
          leaveRoom(room);
        }
        return;
      }
    } catch (err) {
      console.warn('Could not verify room, using local delete', err);
    }

    if (window.confirm(`You are the host of ${room.name}. This will permanently delete the room for everyone. Are you sure?`)) {
      try {
        const roomRef = doc(db, 'rooms', room.id);
        await deleteDoc(roomRef);
        leaveRoom(room);
      } catch (e) {
        alert('Error deleting room: ' + e.message);
      }
    }
  };

  const confirmPermanentDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteDoc(doc(db, 'rooms', confirmDelete.id));
      leaveRoom(confirmDelete);
      setConfirmDelete(null);
      alert('Room permanently deleted.');
    } catch (e) {
      alert('Error deleting room: ' + e.message);
      setConfirmDelete(null);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (roomCode.trim()) {
      const formattedRoom = roomCode.trim().replace(/\s+/g, '-').toLowerCase();
      try {
        const roomRef = doc(db, 'rooms', formattedRoom);
        const roomSnap = await getDoc(roomRef);
        
        if (roomSnap.exists()) {
          const data = roomSnap.data();
          saveToHistory(formattedRoom, data.name, data.parentId || null);
          navigate(`/board/${formattedRoom}`);
        } else {
          alert('Room not found! Please check the ID and try again.');
        }
      } catch (e) {
        alert('Error joining room: ' + e.message);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Firebase signout error", e);
    }
    localStorage.removeItem('userName');
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    navigate('/');
  };

  // Only show root level boards on dashboard; exam rooms live under /exams.
  const rootRooms = roomHistory.filter(r => !r.parentId && r.kind !== 'exam');
  const filteredRooms = rootRooms.filter(r => r.name.toLowerCase().includes(sidebarSearch.toLowerCase()));

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      backgroundColor: 'var(--board-bg)',
      color: '#000',
      overflow: 'hidden'
    }}>
      
      {/* Sidebar */}
      <div className="neo-border" style={{
        width: '280px',
        backgroundColor: 'var(--accent-purple)',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: 'none',
        borderTop: 'none',
        borderBottom: 'none'
      }}>
        <button 
          onClick={() => navigate('/dashboard')}
          className="dashboard-sidebar-btn"
          style={{
            height: '60px',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '16px',
            cursor: 'pointer',
            textAlign: 'left',
            background: 'var(--accent-green)'
          }}
        >
          <div style={{ width: '32px', height: '32px', border: '3px solid #000', backgroundColor: 'var(--surface-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layout size={18} color="#000" />
          </div>
          Dashboard Home
        </button>

        <button 
          onClick={() => navigate('/exams')}
          className="dashboard-sidebar-btn"
          style={{
            height: '60px',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '16px',
            cursor: 'pointer',
            textAlign: 'left',
            background: 'var(--surface-color)'
          }}
        >
          <div style={{ width: '32px', height: '32px', border: '3px solid #000', backgroundColor: 'var(--accent-pink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={18} color="#000" />
          </div>
          Exams
        </button>

        {/* Content List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', background: 'var(--surface-color)' }}>

          
          <div style={{ margin: '16px 0 8px' }}>
             <span className="neo-badge" style={{ background: 'var(--accent-pink)', fontSize: '12px' }}>Recent Rooms</span>
          </div>
          
          {filteredRooms.length === 0 && (
             <div style={{ padding: '8px 0', fontSize: '14px', fontWeight: '600' }}>
               No rooms found.
             </div>
          )}

           {filteredRooms.map(room => (
            <button 
              key={room.id}
              onClick={() => navigate(`/board/${room.id}`)}
              className="dashboard-room-btn"
              style={{
                width: '100%', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '12px',
                marginBottom: '8px',
                background: 'var(--surface-color)'
              }}
            >
              <Hash size={20} /> {room.name}
            </button>
          ))}
        </div>

        {/* Sidebar Actions */}
        <div style={{ padding: '16px', background: 'var(--surface-color)', borderTop: '3px solid #000', display: 'flex', gap: '8px' }}>
           <button onClick={() => setShowCreateModal(true)} className="neo-btn" style={{ flex: 1, background: 'var(--accent-purple)', padding: '8px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
             <Plus size={16} /> Create
           </button>
           <button onClick={() => setShowJoinModal(true)} className="neo-btn" style={{ flex: 1, background: 'var(--accent-yellow)', padding: '8px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
             <LogIn size={16} /> Join
           </button>
        </div>

        {/* User Settings Footer */}
        <div className="neo-border" style={{
          backgroundColor: 'var(--accent-yellow)',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderLeft: 'none',
          borderRight: 'none',
          borderBottom: 'none',
          flexWrap: 'wrap'
        }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '0', border: '3px solid #000', backgroundColor: 'var(--surface-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: '900' }}>
            {displayName[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <span style={{ color: '#000', fontSize: '16px', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</span>
            <span className="neo-badge" style={{ background: 'var(--accent-purple)', fontSize: '10px', marginTop: '4px', alignSelf: 'flex-start' }}>{userRole}</span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
              <button 
                onClick={handleLogout}
                title="Log Out"
                style={{ background: 'var(--accent-orange)', border: '3px solid #000', color: '#000', cursor: 'pointer', padding: '6px', boxShadow: '2px 2px 0px #000' }}
              >
                <LogOut size={16} />
              </button>
              <button style={{ background: 'var(--accent-blue)', border: '3px solid #000', color: '#000', cursor: 'pointer', padding: '6px', boxShadow: '2px 2px 0px #000' }}>
                <Settings size={16} />
              </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* Top Navbar */}
        <div className="neo-border" style={{
          height: '60px',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--surface-color)',
          borderTop: 'none',
          borderLeft: 'none',
          borderRight: 'none'
        }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Hash size={24} color="#000" />
            <span className="neo-badge" style={{ background: 'var(--accent-green)', fontSize: '16px' }}>
                Vyomaboard Workspace
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
             <button onClick={() => setShowCreateModal(true)} className="neo-btn" style={{ background: 'var(--accent-purple)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <Plus size={16} /> Create Room
             </button>
             <button onClick={() => setShowJoinModal(true)} className="neo-btn" style={{ background: 'var(--accent-yellow)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <LogIn size={16} /> Join Room
             </button>
             <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
               <input 
                 type="text" 
                 className="neo-input" 
                 placeholder="Search boards..." 
                 value={sidebarSearch}
                 onChange={e => setSidebarSearch(e.target.value)}
                 style={{ padding: '8px 12px 8px 36px', width: '250px' }} 
               />
               <Search size={18} style={{ position: 'absolute', left: '12px' }} color="#000" />
             </div>
          </div>
        </div>

         {/* Main Content */}
         <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
           
           <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                  <span className="neo-title-block" style={{ fontSize: '28px', background: 'var(--accent-pink)', transform: 'rotate(-1deg)' }}>
                      Workspace
                  </span>
                </div>

               {/* Create and Join functionality moved to modals */}

               {/* Rooms (Folder Aesthetic) Section */}
               <div style={{ marginBottom: '24px' }}>
                   <span className="neo-badge" style={{ background: 'var(--accent-green)', fontSize: '18px' }}>Your Boards</span>
               </div>
               
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                 {rootRooms.length === 0 ? (
                   <div className="neo-card" style={{ gridColumn: '1 / -1', textAlign: 'center', backgroundColor: 'var(--surface-color)' }}>
                     <span className="neo-badge" style={{ background: 'var(--accent-pink)', fontSize: '16px' }}>No boards here yet. Create one!</span>
                   </div>
                 ) : (
                   rootRooms.map((room, i) => {
                     const folderColors = ['#FBEA72', '#FF9CEE', '#88D8C0', '#B5EAD7', '#C7CEEA', '#FFB7B2'];
                     const color = folderColors[i % folderColors.length];
                     
                      return (
                        <div key={i} onClick={() => navigate(`/board/${room.id}`)} className="neo-shadow" style={{
                          display: 'flex', flexDirection: 'column', cursor: 'pointer', background: 'transparent', transition: 'transform 0.1s'
                        }} onMouseEnter={e => e.currentTarget.style.transform = 'translate(-4px, -4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translate(0, 0)'}>
                          {/* Folder Tab */}
                          <div style={{
                            width: '40%', height: '24px', background: color, border: '3px solid #000', borderBottom: 'none',
                            borderTopLeftRadius: '8px', borderTopRightRadius: '8px', marginLeft: '16px'
                          }}></div>
                          {/* Folder Body */}
                          <div className="neo-card" style={{ background: color, border: '3px solid #000', borderRadius: '8px', borderTopLeftRadius: '0px', padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                              <span className="neo-badge" style={{ background: 'var(--surface-color)', fontSize: '16px' }}>{room.name}</span>
                              <button onClick={(e) => handleDeleteRoom(room, e)} style={{ background: 'var(--surface-color)', border: '3px solid #000', color: '#000', cursor: 'pointer', padding: '8px', boxShadow: '2px 2px 0px #000', transition: 'transform 0.1s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translate(-2px, -2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translate(0, 0)'}><Trash size={16} /></button>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span className="neo-badge" style={{ background: '#000', color: 'var(--surface-color)', fontSize: '12px' }}>{room.id.substring(0,8)}...</span>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button onClick={(e) => { e.stopPropagation(); navigate(`/board/${room.id}`); }} className="neo-btn" style={{ padding: '8px 16px', fontSize: '14px', backgroundColor: 'var(--surface-color)' }}>Open</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                   })
                 )}
                </div>
              </div>

         </div>
       </div>

      {/* Modals */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div className="neo-window" onClick={e => e.stopPropagation()} style={{ width: '400px' }}>
            <div className="neo-window-header" style={{ background: 'var(--accent-purple)' }}>
              <span style={{ fontWeight: '900', textTransform: 'uppercase' }}>Create a Board</span>
            </div>
            <div className="neo-window-content" style={{ padding: '24px', background: 'var(--surface-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
               <input
                 type="text"
                 className="neo-input"
                 placeholder="Board name (optional)"
                 value={newRoomName}
                 onChange={e => setNewRoomName(e.target.value)}
                 style={{ width: '100%', boxSizing: 'border-box' }}
                 autoFocus
                 onKeyDown={e => { if (e.key === 'Enter') { handleCreateBoard(); setShowCreateModal(false); } }}
               />
               <button onClick={() => { handleCreateBoard(); setShowCreateModal(false); }} className="neo-btn neo-btn-primary" style={{ background: 'var(--accent-purple)', width: '100%' }}>
                 + Create Board
               </button>
            </div>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div className="neo-window" onClick={e => e.stopPropagation()} style={{ width: '400px' }}>
            <div className="neo-window-header" style={{ background: 'var(--accent-yellow)' }}>
              <span style={{ fontWeight: '900', textTransform: 'uppercase' }}>Join by Code</span>
            </div>
            <div className="neo-window-content" style={{ padding: '24px', background: 'var(--surface-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
               <form onSubmit={(e) => { handleJoinRoom(e); setShowJoinModal(false); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                 <input 
                   type="text" 
                   className="neo-input" 
                   placeholder="e.g. team-1" 
                   value={roomCode} 
                   onChange={e => setRoomCode(e.target.value)} 
                   style={{ width: '100%', boxSizing: 'border-box' }} 
                   autoFocus
                 />
                 <button type="submit" disabled={!roomCode.trim()} className="neo-btn neo-btn-primary" style={{ width: '100%', background: 'var(--accent-purple)', opacity: roomCode.trim() ? 1 : 0.5 }}>
                   Join
                 </button>
               </form>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDeleteRoomModal
          room={confirmDelete}
          localUser={{ id: userId, name: displayName }}
          onConfirm={confirmPermanentDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

    </div>
  );
}
