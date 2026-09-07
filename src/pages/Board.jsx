import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { convertToExcalidrawElements } from '@excalidraw/excalidraw';
import { db, storage } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

import MiniMoodboard from '../MiniMoodboard';
import HostControlPanel from '../components/HostControlPanel';
import RosterModal from '../components/RosterModal';
import AttendanceModal from '../components/AttendanceModal';
import ExamWindowModal from '../components/ExamWindowModal';
import AddQuestionModal from '../components/AddQuestionModal';
import AuthFieldsEditorModal from '../components/AuthFieldsEditorModal';
import ClassSettingsModal from '../components/ClassSettingsModal';

import FileViewerModal from '../FileViewerModal';
import BoardViewerModal from '../BoardViewerModal';
import FolderViewerModal from '../FolderViewerModal';
import ChartEditorModal from '../ChartEditorModal';
import ThemeSettingsModal from '../ThemeSettingsModal';
import CallManager from '../components/CallManager';
import { useCallContext } from '../context/CallContext';
import ChatPanel from '../components/ChatPanel';
import TemplatesModal from '../components/TemplatesModal';
import ChoiceFileModal from '../components/ChoiceFileModal';
import { useYjsStore } from '../useYjsStore';
import { useParams, useNavigate } from 'react-router-dom';
import { isTeacherRole, isAssignedTeacher, actingHostId } from '../lib/classMeta';
import { addRoomToHistory } from '../lib/roomHistory';
import { sweepHostActions } from '../lib/hostControl';
import TopBar from '../components/TopBar';
import ExcalidrawCanvas from '../components/ExcalidrawCanvas';

const dummyEditor = {
  getCurrentToolId: () => 'select',
  getSharedStyles: () => ({ getAsKnownValue: () => null }),
  user: { updateUserPreferences: () => {} },
  store: { listen: () => () => {}, put: () => {} },
  on: () => {},
  off: () => {},
  setCurrentTool: () => {},
  deleteShapes: () => {},
  setStyleForNextShapes: () => {},
  setStyleForSelectedShapes: () => {},
  getViewportPageBounds: () => ({ center: { x: 0, y: 0 } }),
  createShape: () => {},
  getCurrentPageShapes: () => [],
  getCamera: () => ({ x: 0, y: 0, z: 1 }),
  putExternalContent: () => {},
  getInstanceState: () => ({ isReadonly: false }),
  getShape: () => null,
  zoomToShapes: () => {},
  setCamera: () => {},
  updateInstanceState: () => {},
};

export default function Board() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [activeTool, setActiveTool] = useState('selection');
  
  // Yjs Sync
  const { status: yjsStatus, doc: ydoc, provider, awareness, elementsMap, customCardsMap, roomConfigMap } = useYjsStore({ roomId: id });
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
    const observer = (event) => {
      loadCards();
    };

    customCardsMap.observe(observer);

    return () => {
      customCardsMap.unobserve(observer);
    };
  }, [customCardsMap]);

  // Wrapper to update both local state and Yjs map
  const handleUpdateCustomCards = (updater) => {
    setCustomCards(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (customCardsMap) {
        // Sync to Yjs
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
      }
      return next;
    });
  };

  const customEditor = {
    ...dummyEditor,
    getCurrentToolId: () => activeTool,
    setCurrentTool: (tool) => {
      setActiveTool(tool);
      if (excalidrawAPI) {
        const toolMap = {
          'select': 'selection',
          'draw': 'freedraw',
          'pen': 'freedraw',
          'eraser': 'eraser',
          'hand': 'hand',
          'rectangle': 'rectangle',
          'ellipse': 'ellipse',
          'circle': 'ellipse',
          'diamond': 'diamond',
          'arrow': 'arrow',
          'line': 'line',
          'text': 'text',
        };
        const targetTool = toolMap[tool] || 'selection';
        excalidrawAPI.updateScene({
          appState: { activeTool: { type: targetTool } }
        });
      }
    },
    store: {
      listen: () => () => {},
      put: () => {}
    }
  };

  const [userName, setUserName] = useState(() => localStorage.getItem('userName') || 'Anonymous');
  const [accentColor, setAccentColor] = useState(() => {
    const saved = localStorage.getItem('themeAccent');
    return saved ? JSON.parse(saved) : { id: 'periwinkle', hex: '#92a9e1', hover: '#92a9e1' };
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  const handleFileUpload = async (files, e) => {
    let dropX = window.innerWidth / 2;
    let dropY = window.innerHeight / 2;

    if (e) {
      dropX = e.clientX;
      dropY = e.clientY;
    }

    const fileArray = Array.from(files);
    for (const file of fileArray) {
      setIsUploading(true);
      try {
        const fileRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytesResumable(fileRef, file);
        const url = await getDownloadURL(snapshot.ref);

        if (excalidrawAPI) {
          const appState = excalidrawAPI.getAppState();
          const zoom = appState.zoom.value;
          const scrollX = appState.scrollX;
          const scrollY = appState.scrollY;

          // Convert screen coordinates to canvas coordinates
          const canvasX = (dropX / zoom) - scrollX;
          const canvasY = (dropY / zoom) - scrollY;

          handleUpdateCustomCards(prev => [...prev, {
            id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            url: url,
            x: canvasX,
            y: canvasY,
            type: 'file'
          }]);
        }
      } catch (err) {
        console.error('Upload failed:', err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files, e);
    }
  };

  const fileInputRef = useRef(null);

  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [placingTemplate, setPlacingTemplate] = useState(null);
  const [activePreviewFile, setActivePreviewFile] = useState(null);
  const [activeFolder, setActiveFolder] = useState(null);
  const [activeBoard, setActiveBoard] = useState(null);
  const [activeChartEditor, setActiveChartEditor] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null);
  const [promptConfig, setPromptConfig] = useState(null);
  const [showChoiceFileModal, setShowChoiceFileModal] = useState(false);
  const [pendingFileLinkParentId, setPendingFileLinkParentId] = useState(null);
  const [showRoster, setShowRoster] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);
  const [examWindow, setExamWindow] = useState(null);
  const [examEditMode, setExamEditMode] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [showAuthFields, setShowAuthFields] = useState(false);
  const [showHostControls, setShowHostControls] = useState(false);
  const [showClassSettings, setShowClassSettings] = useState(false);
  const [presentUserIds, setPresentUserIds] = useState([]);
  const [actingHost, setActingHost] = useState(null);
  const [hostLocked, setHostLocked] = useState(false);
  const [perms, setPerms] = useState({ share: true, files: true, mic: true, copyPaste: true });
  const [quizCount, setQuizCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const localUserId = localStorage.getItem('userId');
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
    
    // Announce ourselves
    awareness.setLocalStateField('userId', localUserId);

    const updatePresence = () => {
      const states = awareness.getStates();
      const users = new Set();
      states.forEach(state => {
        if (state.userId) users.add(state.userId);
      });
      setPresentUserIds(Array.from(users));
    };

    updatePresence();
    awareness.on('change', updatePresence);
    return () => awareness.off('change', updatePresence);
  }, [awareness, localUserId]);

  useEffect(() => {
    if (roomInfo) {
      setActingHost(actingHostId(roomInfo, presentUserIds.length > 0 ? presentUserIds : [localUserId]));
    }
  }, [roomInfo, localUserId, presentUserIds]);

  // Auth guard — boards opened via share link must go through auth first.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token && id) {
      navigate(`/auth?next=/board/${id}`);
    }
  }, [id, navigate]);
  
  // Communication States
  const { isCallActive, isCallHidden, setIsCallHidden, callMode, joinCall, leaveCall, isMicMuted, setIsMicMuted, isVideoOff, setIsVideoOff } = useCallContext();
  
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Theme State
  const [showThemeSettings, setShowThemeSettings] = useState(false);
  const [mode, setMode] = useState(() => localStorage.getItem('themeMode') || 'dark');
  const [boardType, setBoardType] = useState(() => localStorage.getItem('themeBoard') || 'pinboard');

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
    localStorage.setItem('themeBoard', boardType);
    localStorage.setItem('themeAccent', JSON.stringify(accentColor));

    document.body.setAttribute('data-mode', mode);
    document.body.setAttribute('data-board', boardType);
    document.documentElement.style.setProperty('--accent', accentColor.hex);
    document.documentElement.style.setProperty('--accent-hover', accentColor.hover);
  }, [mode, boardType, accentColor]);

  useEffect(() => {
    if (id) {
      const fetchRoom = async () => {
        try {
          const roomRef = doc(db, 'rooms', id);
          const roomSnap = await getDoc(roomRef);
          if (roomSnap.exists()) {
            const data = roomSnap.data();
            setRoomInfo(data);
            window['currentRoomHostId'] = data.hostId;
            addRoomToHistory(id, data.name, data.parentId || null, data.kind || 'board');
          } else {
            console.warn("Room doesn't exist in Firebase, falling back to local mode");
            setRoomInfo({ name: id, hostId: 'local' });
            window['currentRoomHostId'] = 'local';
          }
        } catch (e) {
          console.error("Firebase error, falling back to local mode:", e);
          setRoomInfo({ name: id, hostId: 'local' });
          window['currentRoomHostId'] = 'local';
        } finally {
          setLoading(false);
        }
      };
      fetchRoom();
    } else {
      setLoading(false);
    }
  }, [id, navigate]);

  const isExamRoom = roomInfo?.kind === 'exam';
  const addShape = (type) => {
    if (type === 'milanote-card') {
      customEditor.setCurrentTool('text');
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
          
          if (excalidrawAPI) {
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            const zoom = excalidrawAPI.getAppState().zoom.value;
            const scrollX = excalidrawAPI.getAppState().scrollX;
            const scrollY = excalidrawAPI.getAppState().scrollY;
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
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Top Bar Navigation */}
      <TopBar 
        roomName={id || 'global'} 
        roomInfo={roomInfo}
        localUserId={localUserId}
        actingHost={actingHost}
        onOpenHostControls={() => setShowHostControls(true)}
        onOpenRoster={() => setShowRoster(true)}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
      />

      <div style={{ display: 'flex', flex: 1, position: 'relative', minHeight: 0 }}>


      <div 
        style={{ flex: 1, position: 'relative', minHeight: 0 }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isUploading && (
          <div style={{
            position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)',
            background: 'var(--accent-yellow)', border: '2px solid #000', padding: '8px 16px',
            borderRadius: '8px', zIndex: 10000, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <Loader2 className="spin" size={16} /> Uploading...
          </div>
        )}
        <input 
          type="file" 
          multiple 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFileUpload(e.target.files);
            }
          }}
        />
        <ExcalidrawCanvas 
          excalidrawAPI={excalidrawAPI}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          addShape={addShape}
          themeMode={mode}
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
          onCustomToolClick={(tool) => {
            if (tool === 'upload') {
              fileInputRef.current?.click();
            } else if (tool === 'nested') {
              addShape('milanote-board');
            } else if (tool === 'create') {
              addShape('milanote-file');
            } else if (tool === 'call') {
              // Not implemented yet, leave for phase 13
            }
          }}
          onCardDoubleClick={(card) => {
            if (card.type === 'file') {
              setActivePreviewFile({ url: card.url, name: card.name });
            } else if (card.type === 'nested-board') {
              setActiveBoard({ boardId: card.boardId, name: card.name, files: [] });
            }
          }}
          onCanvasReady={setExcalidrawAPI}
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
        />
      </div>

      {isChatOpen && (
        <ChatPanel
            onClose={() => setIsChatOpen(false)}
            roomId={id}
            roomInfo={roomInfo}
        />
      )}
      
      {activePreviewFile && (
        <FileViewerModal 
          fileData={activePreviewFile} 
          boardName={roomInfo?.name || 'Untitled'}
          folderFiles={[]}
          onClose={() => setActivePreviewFile(null)}
          editor={customEditor}
          onSaveCloudFile={() => {}}
          onCreateCloudFile={() => {}}
          onOpenFile={() => {}}
        />
      )}

      {showChoiceFileModal && (
        <ChoiceFileModal 
          onClose={() => setShowChoiceFileModal(false)}
          onFileSelect={(files) => {
            setShowChoiceFileModal(false);
            if (excalidrawAPI && files && files.length > 0) {
              const elements = files.map((f, idx) => ({
                type: 'text',
                x: (window.innerWidth / 2) - 100 + (idx * 20),
                y: (window.innerHeight / 2) - 50 + (idx * 20),
                text: `📄 ${f.name}\n(Double-click link to open)`,
                fontSize: 20,
                textAlign: 'center',
                backgroundColor: '#C7CEEA',
                link: `vyoma://file/${f.fileId || f.url || f.id}`,
              }));
              const currentElements = excalidrawAPI.getSceneElements();
              excalidrawAPI.updateScene({ elements: [...currentElements, ...convertToExcalidrawElements(elements)] });
            }
          }}
          onFileUpload={(files) => {
            setShowChoiceFileModal(false);
            if (excalidrawAPI && files && files.length > 0) {
              const elements = files.map((f, idx) => ({
                type: 'text',
                x: (window.innerWidth / 2) - 100 + (idx * 20),
                y: (window.innerHeight / 2) - 50 + (idx * 20),
                text: `📄 ${f.name}\n(Double-click link to open)`,
                fontSize: 20,
                textAlign: 'center',
                backgroundColor: '#C7CEEA',
                link: `vyoma://file/${f.url}`,
              }));
              const currentElements = excalidrawAPI.getSceneElements();
              excalidrawAPI.updateScene({ elements: [...currentElements, ...convertToExcalidrawElements(elements)] });
            }
          }}
        />
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

      {activeChartEditor && (
        <ChartEditorModal
          shapeId={activeChartEditor.shapeId}
          initialChartType={activeChartEditor.chartType}
          initialChartData={activeChartEditor.chartData}
          initialMermaidCode={activeChartEditor.mermaidCode}
          onClose={() => setActiveChartEditor(null)}
          editor={customEditor}
        />
      )}

      {isCallActive && (
        <CallManager 
          isCallHidden={isCallHidden}
          roomInfo={roomInfo}
        />
      )}

      </div>

      {showThemeSettings && (
        <ThemeSettingsModal 
          onClose={() => setShowThemeSettings(false)}
          mode={mode} setMode={setMode}
          accentColor={accentColor} setAccentColor={setAccentColor}
          isHost={actingHost === localUserId}
          editor={customEditor}
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
          editor={customEditor}
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
        <AddQuestionModal editor={customEditor} onClose={() => setShowAddQuestion(false)} />
      )}

      {/* Student details form editor */}
      {showAuthFields && (
        <AuthFieldsEditorModal roomId={id} onClose={() => setShowAuthFields(false)} />
      )}
    </div>
  );
}
