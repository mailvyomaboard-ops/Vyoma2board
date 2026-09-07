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
import Sidebar from '../components/Sidebar';
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

  const handleFileUpload = async (files) => {
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const token = localStorage.getItem('token') || '';
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        const data = await response.json();
        if (data.success && excalidrawAPI) {
          // Add image to canvas
          const img = new Image();
          img.src = data.url;
          img.onload = () => {
            excalidrawAPI.addFiles([{ 
              file: file, 
              x: 0, 
              y: 0, 
              width: Math.min(img.width, 800), 
              height: Math.min(img.height, 600) 
            }]);
          };
          img.onerror = () => {
            // It's not an image! Create a file card instead.
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            
            const elements = convertToExcalidrawElements([{
              type: 'text',
              x: centerX - 100,
              y: centerY - 50,
              text: `📄 ${file.name}\n(Double-click link to open)`,
              fontSize: 20,
              textAlign: 'center',
              backgroundColor: '#C7CEEA', // pastel purple
              link: `vyoma://file/${data.url}`,
            }]);

            const currentElements = excalidrawAPI.getSceneElements();
            excalidrawAPI.updateScene({ elements: [...currentElements, ...elements] });
          };
        }
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }
  };
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [placingTemplate, setPlacingTemplate] = useState(null);
  const [activePreviewFile, setActivePreviewFile] = useState(null);
  const [activeFolder, setActiveFolder] = useState(null);
  const [activeBoard, setActiveBoard] = useState(null);
  const [activeChartEditor, setActiveChartEditor] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
            setActingHost(data.hostId);
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
            const elements = convertToExcalidrawElements([{
              type: 'text',
              x: centerX - 100,
              y: centerY - 50,
              text: `📂 ${name}\n(Double-click link to open)`,
              fontSize: 20,
              textAlign: 'center',
              backgroundColor: '#FFD3B6',
              link: `vyoma://board/${boardId}`,
            }]);
            const currentElements = excalidrawAPI.getSceneElements();
            excalidrawAPI.updateScene({ elements: [...currentElements, ...elements] });
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
      {/* Top Bar Navigation (Top left corner) */}
      <TopBar 
        editor={customEditor} 
        provider={null} 
        roomName={id || 'global'} 
        roomInfo={roomInfo}
        localUserId={localUserId}
        actingHost={actingHost}
        onToggleUnsorted={() => {}}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onOpenHostControls={() => setShowHostControls(true)}
        onOpenRoster={() => setShowRoster(true)}
        onOpenAttendance={() => setShowAttendance(true)}
        onOpenClassSettings={() => setShowClassSettings(true)}
      />

      <div style={{ display: 'flex', flex: 1, position: 'relative', minHeight: 0 }}>
        
        {!isExamRoom && (
        <Sidebar 
          isOpen={isSidebarOpen}
          onAddShape={addShape}
          onShowTemplates={() => setShowTemplatesModal(true)}
          onShowThemeSettings={() => setShowThemeSettings(true)}
          isCallActive={isCallActive} setIsCallActive={(v) => v ? joinCall('video') : leaveCall()}
          isCallHidden={isCallHidden} setIsCallHidden={setIsCallHidden}
          isMicMuted={isMicMuted} setIsMicMuted={setIsMicMuted}
          isVideoOff={isVideoOff} setIsVideoOff={setIsVideoOff}
          onUploadFile={handleFileUpload}
        />
      )}

      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <ExcalidrawCanvas 
          excalidrawAPI={excalidrawAPI}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          addShape={addShape}
          themeMode={mode}
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
          provider={null}
          localClientId={null}
          perms={perms}
          setPerms={(val) => setPerms(val)}
          hostLocked={hostLocked}
          setHostLocked={(val) => setHostLocked(val)}
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
