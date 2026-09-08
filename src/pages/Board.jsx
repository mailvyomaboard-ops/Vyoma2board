import React, { useState, useEffect, useRef } from 'react';
import { Loader2, X } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';


import HostControlPanel from '../components/HostControlPanel';
import RosterModal from '../components/RosterModal';
import AttendanceModal from '../components/AttendanceModal';
import ExamWindowModal from '../components/ExamWindowModal';
import AddQuestionModal from '../components/AddQuestionModal';
import AuthFieldsEditorModal from '../components/AuthFieldsEditorModal';
import ClassSettingsModal from '../components/ClassSettingsModal';

import FileViewerModal from '../FileViewerModal';
import { getApiUrl } from '../config';
import BoardViewerModal from '../BoardViewerModal';
import FolderViewerModal from '../FolderViewerModal';
import ThemeSettingsModal from '../ThemeSettingsModal';
import ChatPanel from '../components/ChatPanel';
import TemplatesModal from '../components/TemplatesModal';
import ChoiceFileModal from '../components/ChoiceFileModal';
import { useYjsStore } from '../useYjsStore';
import { useParams, useNavigate } from 'react-router-dom';
import { actingHostId } from '../lib/classMeta';
import { sweepHostActions } from '../lib/hostControl';
import { addRoomToHistory } from '../lib/roomHistory';
import Peer from 'peerjs';
import TopBar from '../components/TopBar';
import ExcalidrawCanvas from '../components/ExcalidrawCanvas';
import { ErrorBoundary } from '../ErrorBoundary';

export default function Board() {
  const { id } = useParams();
  const navigate = useNavigate();

  const excalidrawAPIRef = useRef(null);
  const [activeTool, setActiveTool] = useState('selection');
  
  const localUserId = localStorage.getItem('userId');
  
  // Yjs Sync
  const { doc: ydoc, provider, awareness, elementsMap, customCardsMap, roomConfigMap } = useYjsStore({ roomId: id, localUserId });
  const [customCards, setCustomCards] = useState([]);



  useEffect(() => {
    if (!customCardsMap) return;

    // Load initial state from Yjs
    const loadCards = () => {
      const cards = [];
      customCardsMap.forEach((card) => {
        cards.push(card);
      });
      setCustomCards(cards);
    };

    loadCards();

    // Listen for remote updates
    let timeoutId = null;
    const observer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => loadCards(), 16); // ~60fps throttle
    };

    customCardsMap.observe(observer);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      customCardsMap.unobserve(observer);
    };
  }, [customCardsMap]);

  // Wrapper to update Yjs map (local state will sync via observer)
  const handleUpdateCustomCards = (updater) => {
    if (!customCardsMap || !ydoc) {
      // Fallback for purely local before connection
      setCustomCards(prev => typeof updater === 'function' ? updater(prev) : updater);
      return;
    }

    const prev = Array.from(customCardsMap.values());
    const next = typeof updater === 'function' ? updater(prev) : updater;
    
    ydoc.transact(() => {
      const nextIds = new Set(next.map(c => c.id));
      
      // Delete removed cards
      prev.forEach(card => {
        if (!nextIds.has(card.id)) {
          customCardsMap.delete(card.id);
        }
      });

      // Set updated or new cards
      next.forEach(card => {
        customCardsMap.set(card.id, card);
      });
    });
  };

  const fileInputRef = useRef(null);


  const [showCreateFileModal, setShowCreateFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const handleCreateFileSubmit = () => {
    if (!newFileName.trim()) return;
    const safeName = newFileName.trim().endsWith('.ipynb') ? newFileName.trim() : `${newFileName.trim()}.ipynb`;
    const zoom = excalidrawAPIRef.current?.getAppState()?.zoom?.value || 1;
    const scrollX = excalidrawAPIRef.current?.getAppState()?.scrollX || 0;
    const scrollY = excalidrawAPIRef.current?.getAppState()?.scrollY || 0;
    
    handleUpdateCustomCards(prev => [...prev, {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      type: 'notebook',
      name: safeName,
      x: -scrollX + (window.innerWidth / 2 / zoom),
      y: -scrollY + (window.innerHeight / 2 / zoom)
    }]);
    
    setShowCreateFileModal(false);
    setNewFileName('');
  };

  const [accentColor, setAccentColor] = useState(() => {
    const saved = localStorage.getItem('themeAccent');
    return saved ? JSON.parse(saved) : { id: 'periwinkle', hex: '#92a9e1', hover: '#92a9e1' };
  });



  const [showTemplatesModal, setShowTemplatesModal] = useState(false);

  const [activePreviewFile, setActivePreviewFile] = useState(null);
  const [activeFolder, setActiveFolder] = useState(null);
  const [activeBoard, setActiveBoard] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null);

  const [showChoiceFileModal, setShowChoiceFileModal] = useState(false);

  const [showRoster, setShowRoster] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);
  const [examWindow, setExamWindow] = useState(null);
  const [examEditMode, setExamEditMode] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [showAuthFields, setShowAuthFields] = useState(false);
  const [showHostControls, setShowHostControls] = useState(false);
  const [showClassSettings, setShowClassSettings] = useState(false);
  const [presentUsers, setPresentUsers] = useState([]);
  const [actingHost, setActingHost] = useState(null);
  const [hostLocked, setHostLocked] = useState(false);
  const [perms, setPerms] = useState({ share: true, files: true, mic: true, copyPaste: true });
  const [quizCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const isHost = actingHost === localUserId;
  const canEdit = isHost || !hostLocked;

  // Sync Room Config
  useEffect(() => {
    if (!roomConfigMap) return;

    const loadConfig = () => {
      setHostLocked(roomConfigMap.get('hostLocked') || false);
      const remotePerms = roomConfigMap.get('perms');
      if (remotePerms) {
        setPerms(remotePerms);
      }
    };

    loadConfig();
    const observer = () => loadConfig();
    roomConfigMap.observe(observer);

    return () => roomConfigMap.unobserve(observer);
  }, [roomConfigMap]);

  // Sync Awareness Presence
  useEffect(() => {
    if (!awareness) return;

    const userName = localStorage.getItem('userName') || 'Anonymous';
    const userColor = accentColor?.hex || '#ff4444';

    // Announce ourselves with full user info for cursor rendering
    awareness.setLocalStateField('userId', localUserId);
    awareness.setLocalStateField('user', { name: userName, color: userColor });

    const updatePresence = () => {
        const states = awareness.getStates();
        const usersMap = new Map();
        states.forEach((state, clientId) => {
          if (state.user) {
            usersMap.set(state.userId || clientId, {
              clientId,
              id: state.authUserId || state.userId || clientId,
              name: state.user.name,
              color: state.user.color,
              isSpeaking: state.isSpeaking || false
            });
          }
        });
        const newUsers = Array.from(usersMap.values()).sort((a, b) => a.id.localeCompare(b.id));
        
        setPresentUsers(prev => {
          if (prev.length !== newUsers.length) return newUsers;
          let changed = false;
          for (let i = 0; i < prev.length; i++) {
            if (prev[i].clientId !== newUsers[i].clientId || 
                prev[i].id !== newUsers[i].id ||
                prev[i].name !== newUsers[i].name ||
                prev[i].color !== newUsers[i].color ||
                prev[i].isSpeaking !== newUsers[i].isSpeaking) {
              changed = true;
              break;
            }
          }
          return changed ? newUsers : prev;
        });

      // Enforce Host Actions
      if (actingHost) {
          sweepHostActions(provider, actingHost, awareness.clientID, (action) => {
            const { cmd } = action;
            if (cmd === 'allowMic') setPerms(p => ({ ...p, mic: true }));
            if (cmd === 'blockMic') {
              setPerms(p => ({ ...p, mic: false }));
              setMicActive(false); // Force close mic
            }
            if (cmd === 'unlock') setHostLocked(false);
            if (cmd === 'lock') setHostLocked(true);
            if (cmd === 'allowShare') setPerms(p => ({ ...p, share: true }));
            if (cmd === 'blockShare') setPerms(p => ({ ...p, share: false }));
            if (cmd === 'allowFiles') setPerms(p => ({ ...p, files: true }));
            if (cmd === 'blockFiles') setPerms(p => ({ ...p, files: false }));
            if (cmd === 'allowCopyPaste') setPerms(p => ({ ...p, copyPaste: true }));
            if (cmd === 'blockCopyPaste') setPerms(p => ({ ...p, copyPaste: false }));
            
            if (cmd === 'bringAllToMe' && excalidrawAPIRef.current) {
              excalidrawAPIRef.current.updateScene({
                appState: {
                  scrollX: action.x || 0,
                  scrollY: action.y || 0,
                  zoom: { value: action.zoom || 1 }
                }
              });
            }
            if (cmd === 'clearBoard' && excalidrawAPIRef.current) {
               const elements = excalidrawAPIRef.current.getSceneElements();
               const remainingElements = elements.filter(el => el.locked);
               excalidrawAPIRef.current.updateScene({ elements: remainingElements });
            }
          });
      }
    };

    updatePresence();
    awareness.on('change', updatePresence);

    const handleProfileUpdate = () => {
      const newName = localStorage.getItem('userName') || 'Anonymous';
      let newColor = '#ff4444';
      try {
        const saved = localStorage.getItem('themeAccent');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.hex) newColor = parsed.hex;
        }
      } catch (e) {}
      awareness.setLocalStateField('user', { name: newName, color: newColor });
    };
    window.addEventListener('profile-updated', handleProfileUpdate);

    return () => {
      awareness.off('change', updatePresence);
      window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, [awareness, localUserId, accentColor]);

  useEffect(() => {
    if (roomInfo) {
      const ids = presentUsers.map(u => u.id);
      setActingHost(actingHostId(roomInfo, ids.length > 0 ? ids : [localUserId]));
    }
  }, [roomInfo, localUserId, presentUsers]);

  // Auth guard - boards opened via share link must go through auth first.
  useEffect(() => {
    if (roomInfo && roomInfo.isExam && !['host','teacher'].includes(localStorage.getItem('userRole'))) {
      const loaded = JSON.parse(localStorage.getItem('userProfile') || '{}');
      if (!loaded.prn || !loaded.rollNo) {
        setShowAuthFields(true);
      }
    }
  }, [roomInfo]);

  // Voice Activity Detection Helper
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const vadRafRef = useRef(null);

  // Audio State
  const [peer, setPeer] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const callsRef = useRef({});

  // Communication States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);

  // Initialize PeerJS for Audio
  useEffect(() => {
    if (!localUserId) return;
    
    const newPeer = new Peer(`vyomaboard-audio-${localUserId}-${id}`, {
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject"
          },
          {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject"
          },
          {
            urls: "turn:openrelay.metered.ca:443?transport=tcp",
            username: "openrelayproject",
            credential: "openrelayproject"
          }
        ]
      }
    });
    
    newPeer.on('open', (id) => {
      console.log('My peer ID is: ' + id);
      setPeer(newPeer);
    });

    newPeer.on('call', (call) => {
      if (!localStream) {
        call.answer();
      } else {
        call.answer(localStream);
      }
      
      call.on('stream', (remoteStream) => {
        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.autoplay = true;
        audio.play().catch(e => console.error('Audio play failed:', e));
      });
      // We do NOT add inbound calls to callsRef so that our outbound effect will still call them when our mic activates
    });

    return () => {
      newPeer.destroy();
    };
  }, [localUserId, id, localStream]);

  // Handle Local Mic Toggle & VAD
  const [micActive, setMicActive] = useState(false);
  
  // Expose a toggle for the TopBar
  const toggleMic = () => {
    setMicActive(prev => !prev);
  };

  useEffect(() => {
    if (micActive && !localStream) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        setLocalStream(stream);
        
        // Setup VAD
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          audioContextRef.current = new AudioContext();
          const source = audioContextRef.current.createMediaStreamSource(stream);
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.minDecibels = -80;
          analyserRef.current.maxDecibels = -10;
          analyserRef.current.smoothingTimeConstant = 0.85;
          source.connect(analyserRef.current);
          
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          let wasSpeaking = false;
          
          const checkAudio = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            const sum = dataArray.reduce((a, b) => a + b, 0);
            const avg = sum / dataArray.length;
            
            const isLoud = avg > 5; // Lowered Threshold
            if (isLoud !== wasSpeaking) {
              wasSpeaking = isLoud;
              if (awareness) {
                awareness.setLocalStateField('isSpeaking', isLoud);
              }
            }
            vadRafRef.current = requestAnimationFrame(checkAudio);
          };
          checkAudio();
        }
      }).catch(err => {
        console.error('Failed to get local stream', err);
        alert('Microphone access denied or failed.');
        setMicActive(false);
        if (awareness) awareness.setLocalStateField('isSpeaking', false);
      });
    } else if (!micActive && localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
      if (vadRafRef.current) cancelAnimationFrame(vadRafRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
        analyserRef.current = null;
      }
      Object.values(callsRef.current).forEach(c => c.close());
      callsRef.current = {};
      if (awareness) awareness.setLocalStateField('isSpeaking', false);
    }
  }, [micActive, peer, awareness, id, localStream, localUserId, presentUsers]);

  // Make sure new peers get called if we are active
  useEffect(() => {
    if (micActive && localStream && peer) {
      presentUsers.forEach(u => {
        if (u.id !== localUserId) {
          const peerId = `vyomaboard-audio-${u.id}-${id}`;
          if (!callsRef.current[peerId]) {
            const call = peer.call(peerId, localStream);
            if (call) {
              call.on('stream', (remoteStream) => {
                const audio = new Audio();
                audio.srcObject = remoteStream;
                audio.autoplay = true;
                audio.play().catch(e => console.error('Audio play failed:', e));
              });
              callsRef.current[peerId] = call;
            }
          }
        }
      });
    }
  }, [presentUsers, micActive, localStream, peer, localUserId, id]);

  // Theme State
  const [showThemeSettings, setShowThemeSettings] = useState(false);
  const [boardType] = useState(() => localStorage.getItem('themeBoard') || 'pinboard');

  useEffect(() => {
    localStorage.setItem('themeBoard', boardType);
    localStorage.setItem('themeAccent', JSON.stringify(accentColor));

    document.body.setAttribute('data-board', boardType);
    document.documentElement.style.setProperty('--accent', accentColor.hex);
    document.documentElement.style.setProperty('--accent-hover', accentColor.hover);
  }, [boardType, accentColor]);

  useEffect(() => {
    if (id) {
      const fetchRoom = async () => {
        let isResolved = false;
        const fallbackTimer = setTimeout(() => {
          if (!isResolved) {
            console.warn("Firebase fetchRoom timed out. Falling back to local mode.");
            isResolved = true;
            setLoading(false);
          }
        }, 5000); // 5s timeout

        try {
          const roomRef = doc(db, 'rooms', id);
          const roomSnap = await getDoc(roomRef);
          
          if (isResolved) return; // Ignore if timed out
          
          if (roomSnap.exists()) {
            const data = roomSnap.data();
            setRoomInfo(data);
            addRoomToHistory(id, data.name, data.parentId || null, data.kind || 'board');
          } else {
            console.log("Room doesn't exist, creating new room:", id);
            const userId = localStorage.getItem('userId') || 'anonymous';
            const newRoomData = {
              name: id,
              hostId: userId,
              createdAt: serverTimestamp(),
              kind: 'board',
              parentId: null,
              perms: { share: true, files: true, mic: true, copyPaste: true }
            };
            await setDoc(roomRef, newRoomData);
            if (!isResolved) {
              setRoomInfo(newRoomData);
              addRoomToHistory(id, id, null, 'board');
            }
          }
          if (!isResolved) {
            isResolved = true;
            clearTimeout(fallbackTimer);
            setLoading(false);
          }
        } catch (e) {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(fallbackTimer);
            console.error("Firebase error during fetchRoom:", e);
            setLoading(false); // Fallback to local mode
          }
        }
      };
      fetchRoom();
    } else {
      setLoading(false);
    }
  }, [id, navigate]);

  const addShape = (type) => {
    if (type === 'milanote-card') {
      setActiveTool('text');
      if (excalidrawAPIRef.current) {
        excalidrawAPIRef.current.updateScene({
          appState: { activeTool: { type: 'text' } }
        });
      }
    } else if (type === 'milanote-file') {
      setShowChoiceFileModal(true);
    } else if (type === 'milanote-board') {
      const name = prompt("Enter a name for the new Nested Board:");
      if (!name) return;
      
      const createBoard = async () => {
        try {
          const docRef = await addDoc(collection(db, 'rooms'), {
            name: name,
            createdAt: serverTimestamp(),
            parentId: id || null,
            kind: 'board'
          });
          const boardId = docRef.id;
          
          if (excalidrawAPIRef.current) {
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            const zoom = excalidrawAPIRef.current.getAppState().zoom.value;
            const scrollX = excalidrawAPIRef.current.getAppState().scrollX;
            const scrollY = excalidrawAPIRef.current.getAppState().scrollY;
            const canvasX = (centerX / zoom) - scrollX;
            const canvasY = (centerY / zoom) - scrollY;

            handleUpdateCustomCards(prev => [...prev, {
              id: `card_${Date.now()}_${boardId}`,
              name: `📂 ${name}`,
              boardId: boardId,
              x: canvasX,
              y: canvasY,
              type: 'nested-board'
            }]);
          }
        } catch (e) {
          console.error("Failed to create nested board", e);
          alert("Failed to create nested board.");
        }
      };
      createBoard();
    }
  };

  if (loading) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#121212', color: 'white' }}>
        <Loader2 size={32} className="spin" />
        <span style={{ marginLeft: '12px' }}>Connecting to Board...</span>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden' }}
      onDragOverCapture={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDropCapture={(e) => {
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const files = Array.from(e.dataTransfer.files);
          let hasNonImage = false;
          files.forEach((file) => {
            if (!file.type.startsWith('image/')) hasNonImage = true;
          });
          
          if (hasNonImage) {
            e.preventDefault();
            e.stopPropagation();
            if (files.length === 1 && files[0].type.startsWith('image/')) return;
            
            const zoom = excalidrawAPIRef.current?.getAppState()?.zoom?.value || 1;
            const scrollX = excalidrawAPIRef.current?.getAppState()?.scrollX || 0;
            const scrollY = excalidrawAPIRef.current?.getAppState()?.scrollY || 0;
            
            files.forEach(async (file) => {
              if (file.type.startsWith('image/')) return;
              
              let fileUrl = URL.createObjectURL(file);
              try {
                const storage = getStorage();
                const fileRef = storageRef(storage, `board-files/${id}/${Date.now()}_${file.name}`);
                const snapshot = await uploadBytes(fileRef, file);
                fileUrl = await getDownloadURL(snapshot.ref);
              } catch (err) {
                console.error("Firebase upload failed, using local blob", err);
              }
              handleUpdateCustomCards(prev => [...prev, {
                id: Date.now().toString() + Math.random().toString(36).substring(7),
                type: file.name.endsWith('.ipynb') ? 'notebook' : 'file',
                name: file.name,
                url: fileUrl,
                x: -scrollX + (window.innerWidth / 2 / zoom),
                y: -scrollY + (window.innerHeight / 2 / zoom)
              }]);
            });
          }
        }
      }}
    >
      {/* Top Bar Navigation */}
      <TopBar 
        roomName={id || 'global'} 
        roomInfo={roomInfo}
        localUserId={localUserId}
        actingHost={actingHost}
        presentUsers={presentUsers}
        awareness={awareness}
        onOpenHostControls={() => setShowHostControls(true)}
        onOpenRoster={() => setShowRoster(true)}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        onOpenSettings={() => setShowThemeSettings(true)}
        isMicOn={micActive}
        onToggleMic={toggleMic}
      />

      <div style={{ display: 'flex', flex: 1, position: 'relative', minHeight: 0 }}>


      <div 
        style={{ flex: 1, position: 'relative', minHeight: 0 }}
      >
        <input 
          type="file" 
          multiple 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={async (e) => {
            if (e.target.files && e.target.files.length > 0) {
              const file = e.target.files[0];
              let fileUrl = URL.createObjectURL(file);
              try {
                const storage = getStorage();
                const fileRef = storageRef(storage, `board-files/${id}/${Date.now()}_${file.name}`);
                const snapshot = await uploadBytes(fileRef, file);
                fileUrl = await getDownloadURL(snapshot.ref);
              } catch (err) {
                console.error("Firebase upload failed, using local blob", err);
              }
              const zoom = excalidrawAPIRef.current?.getAppState()?.zoom?.value || 1;
              const scrollX = excalidrawAPIRef.current?.getAppState()?.scrollX || 0;
              const scrollY = excalidrawAPIRef.current?.getAppState()?.scrollY || 0;
              const isNotebook = file.name.endsWith('.ipynb');
              handleUpdateCustomCards(prev => [...prev, {
                id: Date.now().toString() + Math.random().toString(36).substring(7),
                type: isNotebook ? 'notebook' : 'file',
                name: file.name,
                url: fileUrl,
                x: -scrollX + (window.innerWidth / 2 / zoom),
                y: -scrollY + (window.innerHeight / 2 / zoom)
              }]);
            }
          }}
        />
        <ErrorBoundary>
          <ExcalidrawCanvas 
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            customCards={customCards}
            setCustomCards={handleUpdateCustomCards}
            onCardDelete={(id) => {
              handleUpdateCustomCards(prev => prev.filter(c => c.id !== id));
            }}
            ydoc={ydoc}
            provider={provider}
            awareness={awareness}
            elementsMap={elementsMap}
            viewModeEnabled={!canEdit}
            perms={perms}
            onCustomToolClick={(tool) => {
              if (tool === 'upload') {
                fileInputRef.current?.click();
              } else if (tool === 'nested') {
                addShape('milanote-board');
              } else if (tool === 'create') {
                setNewFileName('');
                setShowCreateFileModal(true);
              }
            }}
            onCardDoubleClick={(card) => {
              if (card.type === 'file' || card.type === 'notebook') {
                setActivePreviewFile({ url: card.url, name: card.name, content: card.content, fileId: card.id });
              } else if (card.type === 'nested-board') {
                setActiveBoard({ boardId: card.boardId, name: card.name, files: [] });
              }
            }}
            onCanvasReady={(api) => { excalidrawAPIRef.current = api; }}
            onLinkOpen={(element, event) => {
              if (element.link && element.link.startsWith('vyoma://')) {
                event.preventDefault();
                const url = new URL(element.link);
                if (url.host === 'file') {
                  setActivePreviewFile({ url: url.pathname.slice(1), name: element.text || 'File' });
                } else if (url.host === 'board') {
                  setActiveBoard({ boardId: url.pathname.slice(1), name: element.text || 'Board', files: [] });
                }
              }
            }}
            localClientId={awareness?.clientID}
          />
        </ErrorBoundary>
      </div>

      {isChatOpen && (
        <ChatPanel
            onClose={() => setIsChatOpen(false)}
            roomInfo={roomInfo}
        />
      )}
      
      {activePreviewFile && (
        <FileViewerModal 
          fileData={activePreviewFile} 
          boardName={roomInfo?.name || 'Untitled'}
          folderFiles={[]}
          onClose={() => setActivePreviewFile(null)}
          onSaveCloudFile={() => {}}
          onCreateCloudFile={() => {}}
          ydoc={ydoc}
          onOpenFile={() => {}}
          editor={null}
        />
      )}

      {showChoiceFileModal && (
        <ChoiceFileModal 
          onClose={() => setShowChoiceFileModal(false)}
          onFileSelect={(files) => {
            setShowChoiceFileModal(false);
            if (excalidrawAPIRef.current && files && files.length > 0) {
              const appState = excalidrawAPIRef.current.getAppState();
              const zoom = appState.zoom.value || 1;
              const scrollX = appState.scrollX || 0;
              const scrollY = appState.scrollY || 0;

              files.forEach(async (f, idx) => {
                let fileUrl = f.url || f.fileId || f.id;
                
                if (f instanceof File) {
                  fileUrl = URL.createObjectURL(f);
                  try {
                    const storage = getStorage();
                    const fileRef = storageRef(storage, `board-files/${id}/${Date.now()}_${f.name}`);
                    const snapshot = await uploadBytes(fileRef, f);
                    fileUrl = await getDownloadURL(snapshot.ref);
                  } catch (err) {
                    console.error("Firebase upload failed, using local blob", err);
                  }
                }

                handleUpdateCustomCards(prev => [...prev, {
                  id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  name: f.name,
                  url: fileUrl,
                  x: -scrollX + (window.innerWidth / 2 / zoom) + (idx * 20),
                  y: -scrollY + (window.innerHeight / 2 / zoom) + (idx * 20),
                  type: 'file'
                }]);
              });
            }
          }}
          onFileUpload={(files) => {
            setShowChoiceFileModal(false);
            if (excalidrawAPIRef.current && files && files.length > 0) {
              const appState = excalidrawAPIRef.current.getAppState();
              const zoom = appState.zoom.value;
              const scrollX = appState.scrollX;
              const scrollY = appState.scrollY;
              const canvasX = ((window.innerWidth / 2) / zoom) - scrollX;
              const canvasY = ((window.innerHeight / 2) / zoom) - scrollY;

              files.forEach((f, idx) => {
                handleUpdateCustomCards(prev => [...prev, {
                  id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  name: f.name,
                  url: f.url || f.fileId,
                  x: canvasX + (idx * 20),
                  y: canvasY + (idx * 20),
                  type: 'file'
                }]);
              });
            }
          }}
        />
      )}

      {showCreateFileModal && (
        <div className="modal-overlay" style={{ zIndex: 99999 }}>
          <div className="neo-window" style={{ width: '400px' }}>
            <div className="neo-window-header" style={{ background: 'var(--accent-green)' }}>
              <span style={{ fontWeight: '900', textTransform: 'uppercase' }}>Create File</span>
              <button onClick={() => setShowCreateFileModal(false)} className="neo-close-btn"><X size={16}/></button>
            </div>
            <div className="neo-window-content" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontWeight: '700', fontSize: '14px' }}>Enter the name for your new file (e.g. analysis.ipynb for a Notebook):</p>
              <input 
                type="text" 
                className="neo-input" 
                placeholder="filename.ipynb"
                value={newFileName}
                onChange={e => setNewFileName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateFileSubmit();
                }}
                autoFocus
              />
              <button onClick={handleCreateFileSubmit} className="neo-btn" style={{ background: 'var(--accent-blue)', color: 'white' }}>
                Create File
              </button>
            </div>
          </div>
        </div>
      )}

      {showTemplatesModal && (
        <TemplatesModal 
          onClose={() => setShowTemplatesModal(false)}
          onSelectTemplate={() => setShowTemplatesModal(false)}
        />
      )}
      
      {activeFolder && (
        <FolderViewerModal 
          folderId={activeFolder.folderId}
          initialName={activeFolder.name}
          initialFiles={activeFolder.files}
          onClose={() => setActiveFolder(null)}
        />
      )}

      {activeBoard && (
        <BoardViewerModal 
          boardId={activeBoard.boardId}
          initialName={activeBoard.name}
          initialFiles={activeBoard.files}
          onClose={() => setActiveBoard(null)}
        />
      )}


      </div>

      {showThemeSettings && (
        <ThemeSettingsModal 
          onClose={() => setShowThemeSettings(false)}
          accentColor={accentColor} setAccentColor={setAccentColor}
          isHost={actingHost === localUserId}
          editor={null}
        />
      )}

      {/* Teacher Tools Modals */}
      {showHostControls && (
        <HostControlPanel
          onClose={() => setShowHostControls(false)}
          provider={provider}
          localClientId={awareness?.clientID}
          perms={perms}
          setPerms={(val) => {
            if (roomConfigMap) {
              ydoc.transact(() => {
                roomConfigMap.set('perms', val);
              });
            } else {
              setPerms(val);
            }
          }}
          hostLocked={hostLocked}
          setHostLocked={(val) => {
            if (roomConfigMap) {
              ydoc.transact(() => {
                roomConfigMap.set('hostLocked', val);
              });
            } else {
              setHostLocked(val);
            }
          }}
          api={excalidrawAPIRef.current}
        />
      )}
      {showClassSettings && <ClassSettingsModal roomId={id} onClose={() => setShowClassSettings(false)} />}
      {showRoster && <RosterModal roomId={id} onClose={() => setShowRoster(false)} />}
      {showAttendance && <AttendanceModal roomId={id} provider={null} onClose={() => setShowAttendance(false)} />}
      {examWindow && (
        <ExamWindowModal
          roomId={id}
          examName={examWindow.name}
          onClose={() => setExamWindow(null)}
          onEdit={() => setExamEditMode(true)}
        />
      )}

      {/* Exam Editor dock */}
      {examEditMode && (
        <div style={{ position: 'fixed', top: '70px', left: '50%', transform: 'translateX(-50%)', zIndex: 100000, display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--accent-green)', border: '3px solid #000', boxShadow: '4px 4px 0 #000', padding: '8px 14px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ fontWeight: '900', fontSize: '13px', textTransform: 'uppercase' }}>📝 Test Editor</span>
          <span className="neo-badge" style={{ background: quizCount > 0 ? 'var(--accent-yellow)' : '#FFB7B2', fontSize: '12px' }}>
            {quizCount} question{quizCount === 1 ? '' : 's'}
          </span>
          <button className="neo-btn" style={{ background: 'var(--accent-yellow)', padding: '8px 12px', fontSize: '13px' }} onClick={() => setShowAddQuestion(true)}>
            ➕ Add Question
          </button>
          <button className="neo-btn" style={{ background: 'var(--accent-purple)', padding: '8px 12px', fontSize: '13px' }} onClick={() => setShowAuthFields(true)}>
            👤 Student Details Form
          </button>
          <button className="neo-btn" style={{ background: 'var(--surface-color)', padding: '8px 12px', fontSize: '13px' }} onClick={() => setExamEditMode(false)}>
            Exit Edit Mode
          </button>
        </div>
      )}

      {/* Add Question form */}
      {showAddQuestion && (
        <AddQuestionModal onClose={() => setShowAddQuestion(false)} />
      )}

      {/* Student details form editor */}
      {showAuthFields && (
        <AuthFieldsEditorModal roomId={id} onClose={() => setShowAuthFields(false)} />
      )}
    </div>
  );
}
