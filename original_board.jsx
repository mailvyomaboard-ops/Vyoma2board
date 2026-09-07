import React, { useCallback, useState, useEffect, useRef } from 'react';
import { 
  Tldraw, 
  createTLStore, 
  defaultShapeUtils, 
  createShapeId,
  DefaultToolbar,
  ToolbarItem,
  useEditor,
  AssetRecordType,
  TldrawUiPopover,
  TldrawUiPopoverTrigger,
  TldrawUiPopoverContent,
  DefaultContextMenu,
  DefaultContextMenuContent,
  TldrawUiMenuGroup,
  TldrawUiMenuItem,
  TldrawUiMenuSubmenu,
  useActions,
  useValue,
  DefaultColorStyle,
  DefaultSizeStyle,
  DefaultFillStyle,
  DefaultDashStyle,
  DefaultFontStyle,
  DefaultHorizontalAlignStyle,
  GeoShapeGeoStyle
} from 'tldraw';
import 'tldraw/tldraw.css';
import { Loader2, Type, CheckSquare, Image as ImageIcon, Layout, Terminal, Settings, Folder, FileCode, Phone, MessageSquare, Mic, Video, VideoOff, MicOff, Pin, PieChart, Sparkles, Pen, Square } from 'lucide-react';
import { NOTE_COLORS } from '../shapes/ShapeColors';
import { db, storage } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { CardShapeUtil } from '../shapes/CardShapeUtil';
import { ListShapeUtil } from '../shapes/ListShapeUtil';
import { FileShapeUtil } from '../shapes/FileShapeUtil';
import { FolderShapeUtil } from '../shapes/FolderShapeUtil';
import CustomMultiplayerCursors from '../components/CustomMultiplayerCursors';
import { ChartShapeUtil } from '../shapes/ChartShapeUtil';
import { BrandGuidelinesShapeUtil } from '../shapes/BrandGuidelinesShapeUtil';
import { VisionBoardShapeUtil } from '../shapes/VisionBoardShapeUtil';
import { WeeklyPlannerShapeUtil } from '../shapes/WeeklyPlannerShapeUtil';
import { EmpathyMapShapeUtil } from '../shapes/EmpathyMapShapeUtil';
import { BrainDumpShapeUtil } from '../shapes/BrainDumpShapeUtil';
import { EisenhowerMatrixShapeUtil } from '../shapes/EisenhowerMatrixShapeUtil';
import { BusinessModelCanvasShapeUtil } from '../shapes/BusinessModelCanvasShapeUtil';
import { TimelineShapeUtil } from '../shapes/TimelineShapeUtil';
import { MindMapNodeShapeUtil } from '../shapes/MindMapNodeShapeUtil';
import { ProductDesignShapeUtil } from '../shapes/ProductDesignShapeUtil';
import { UserStorymapShapeUtil } from '../shapes/UserStorymapShapeUtil';
import { CustomerJourneyMapShapeUtil } from '../shapes/CustomerJourneyMapShapeUtil';
import { RetrospectiveShapeUtil } from '../shapes/RetrospectiveShapeUtil';
import { QuizMcqShapeUtil } from '../shapes/QuizMcqShapeUtil';
import { QuizWrittenShapeUtil } from '../shapes/QuizWrittenShapeUtil';
import { CodeRunnerShapeUtil } from '../shapes/CodeRunnerShapeUtil';
import { VideoCallShapeUtil } from '../shapes/VideoCallShapeUtil';
import { ScreenShareShapeUtil } from '../shapes/ScreenShareShapeUtil';
import { BoardShapeUtil } from '../shapes/BoardShapeUtil';
import { CalculatorShapeUtil } from '../shapes/CalculatorShapeUtil';
import { ExamFileShapeUtil } from '../shapes/ExamFileShapeUtil';
import { QuizCodeShapeUtil } from '../shapes/QuizCodeShapeUtil';
import { HtmlPreviewShapeUtil } from '../shapes/HtmlPreviewShapeUtil';

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
import BottomToolbar from '../components/BottomToolbar';
import StylePanel from '../components/StylePanel';
import { useYjsStore } from '../useYjsStore';
import { useParams, useNavigate } from 'react-router-dom';
import { isTeacherRole, isAssignedTeacher, actingHostId } from '../lib/classMeta';
import { addRoomToHistory } from '../lib/roomHistory';
import { sweepHostActions } from '../lib/hostControl';
import TopBar from '../components/TopBar';

const customShapeUtils = [
  CardShapeUtil, ListShapeUtil, FileShapeUtil, FolderShapeUtil, ChartShapeUtil, BoardShapeUtil,
  BrandGuidelinesShapeUtil, VisionBoardShapeUtil, WeeklyPlannerShapeUtil, EmpathyMapShapeUtil, BrainDumpShapeUtil,
  EisenhowerMatrixShapeUtil, BusinessModelCanvasShapeUtil, TimelineShapeUtil, MindMapNodeShapeUtil,
  ProductDesignShapeUtil, UserStorymapShapeUtil, CustomerJourneyMapShapeUtil, RetrospectiveShapeUtil,
  QuizMcqShapeUtil, QuizWrittenShapeUtil, CodeRunnerShapeUtil, VideoCallShapeUtil, ScreenShareShapeUtil,
  CalculatorShapeUtil, ExamFileShapeUtil, QuizCodeShapeUtil, HtmlPreviewShapeUtil
];

const CustomToolbar = (props) => {
  const [showChartMenu, setShowChartMenu] = React.useState(false);
  const editor = useEditor();

  const handleChartClick = (type, e) => {
    if (e) e.stopPropagation();
    setShowChartMenu(false);
    if (!editor) return;

    const center = editor.getViewportPageBounds().center;
    editor.createShape({
      id: createShapeId(),
      // @ts-ignore
      type: 'milanote-chart',
      x: center.x,
      y: center.y,
      props: { chartType: type }
    });
  };

  const handleQuizClick = (type, e) => {
    if (e) e.stopPropagation();
    if (!editor) return;

    const center = editor.getViewportPageBounds().center;
    editor.createShape({
      id: createShapeId(),
      type: type,
      x: center.x,
      y: center.y
    });
  };

  return (
    <>
    <DefaultToolbar {...props}>
      <TldrawUiPopover id="chart-menu">
        <TldrawUiPopoverTrigger>
          <button 
            className="tlui-button tlui-button__tool"
            title="Insert Chart"
          >
            <span className="tlui-button__icon">
              <PieChart size={20} />
            </span>
          </button>
        </TldrawUiPopoverTrigger>
        <TldrawUiPopoverContent side="top" align="center" sideOffset={8}>
          <div style={{
            background: 'var(--sidebar-bg)',
            border: '4px solid var(--border-color)',
            padding: '8px',
            borderRadius: '0',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            boxShadow: '6px 6px 0px var(--shadow-color)',
            width: '180px',
            pointerEvents: 'all'
          }}>
            <button className="tool-btn" style={{ justifyContent: 'flex-start' }} onPointerDown={(e) => handleChartClick('bar', e)}>
              <span style={{ fontSize: '13px' }}>Bar Chart</span>
            </button>
            <button className="tool-btn" style={{ justifyContent: 'flex-start' }} onPointerDown={(e) => handleChartClick('line', e)}>
              <span style={{ fontSize: '13px' }}>Line Chart</span>
            </button>
            <button className="tool-btn" style={{ justifyContent: 'flex-start' }} onPointerDown={(e) => handleChartClick('pie', e)}>
              <span style={{ fontSize: '13px' }}>Pie Chart</span>
            </button>
            <button className="tool-btn" style={{ justifyContent: 'flex-start' }} onPointerDown={(e) => handleChartClick('mermaid', e)}>
              <span style={{ fontSize: '13px' }}>Flowchart (Mermaid)</span>
            </button>
          </div>
        </TldrawUiPopoverContent>
      </TldrawUiPopover>

      <ToolbarItem tool="select" />
      <ToolbarItem tool="hand" />
      <ToolbarItem tool="text" />
      <ToolbarItem tool="note" />
      <ToolbarItem tool="asset" />

      {/* Draw Tools Menu */}
      <TldrawUiPopover id="draw-menu">
        <TldrawUiPopoverTrigger>
          <button className="tlui-button tlui-button__tool" title="Draw Tools">
            <span className="tlui-button__icon">
              <Pen size={18} />
            </span>
          </button>
        </TldrawUiPopoverTrigger>
        <TldrawUiPopoverContent side="top" align="center" sideOffset={8}>
          <div style={{ background: 'var(--sidebar-bg)', border: '4px solid var(--border-color)', padding: '4px', borderRadius: '0', boxShadow: '6px 6px 0px var(--shadow-color)', display: 'flex', flexDirection: 'row', gap: '4px' }}>
            <ToolbarItem tool="draw" />
            <ToolbarItem tool="highlight" />
            <ToolbarItem tool="laser" />
            <ToolbarItem tool="eraser" />
          </div>
        </TldrawUiPopoverContent>
      </TldrawUiPopover>

      {/* Shapes Menu */}
      <TldrawUiPopover id="shapes-menu">
        <TldrawUiPopoverTrigger>
          <button className="tlui-button tlui-button__tool" title="Shapes">
            <span className="tlui-button__icon">
              <Square size={18} />
            </span>
          </button>
        </TldrawUiPopoverTrigger>
        <TldrawUiPopoverContent side="top" align="center" sideOffset={8}>
          <div style={{ background: 'var(--sidebar-bg)', border: '4px solid var(--border-color)', padding: '4px', borderRadius: '0', boxShadow: '6px 6px 0px var(--shadow-color)', display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '4px' }}>
            <ToolbarItem tool="rectangle" />
            <ToolbarItem tool="ellipse" />
            <ToolbarItem tool="triangle" />
            <ToolbarItem tool="diamond" />
            <ToolbarItem tool="hexagon" />
            <ToolbarItem tool="oval" />
            <ToolbarItem tool="rhombus" />
            <ToolbarItem tool="star" />
            <ToolbarItem tool="cloud" />
            <ToolbarItem tool="heart" />
            <ToolbarItem tool="x-box" />
            <ToolbarItem tool="check-box" />
            <ToolbarItem tool="arrow-left" />
            <ToolbarItem tool="arrow-up" />
            <ToolbarItem tool="arrow-down" />
            <ToolbarItem tool="arrow-right" />
          </div>
        </TldrawUiPopoverContent>
      </TldrawUiPopover>

      <ToolbarItem tool="arrow" />
      <ToolbarItem tool="frame" />
    </DefaultToolbar>
    </>
  );
};
const customUiOverrides = {
  actions(editor, actions) {
    const allActions = {
      ...actions,
      'create-file': {
        id: 'create-file',
        label: 'Create File',
        readonlyOk: false,
        kbd: '',
        onSelect(source) {
          const name = prompt('Enter new file name with extension (e.g. main.c, script.js):', 'New_File.c');
          if (!name) return;
          const center = editor.getViewportPageBounds().center;
          editor.createShape({
            id: createShapeId(),
            type: 'milanote-file',
            x: center.x,
            y: center.y,
            props: { name }
          });
        }
      },

      'rename-item': {
        id: 'rename-item',
        label: 'Rename',
        readonlyOk: false,
        kbd: '',
        onSelect(source) {
          const selected = editor.getSelectedShapes();
          if (selected.length === 1 && (selected[0].type === 'milanote-file' || selected[0].type === 'milanote-folder')) {
            const shape = selected[0];
            const newName = prompt('Enter new name:', shape.props.name);
            if (newName) {
              editor.updateShape({ id: shape.id, type: shape.type, props: { name: newName } });
            }
          }
        }
      },
      
      'export-exam': {
        id: 'export-exam',
        label: 'Export Exam (Markdown)',
        readonlyOk: true,
        kbd: '',
        onSelect() {
          const shapes = editor.getCurrentPageShapes();
          const quizShapes = shapes.filter(s => s.type === 'quiz-mcq-shape' || s.type === 'quiz-written-shape');
          if (quizShapes.length === 0) {
            alert('No quiz questions found on the board.');
            return;
          }
          
          quizShapes.sort((a, b) => a.y - b.y);
          
          const writeExam = (withAnswers) => {
            let md = '# Exam Export\n\n';
            let totalMarks = 0;
            
            quizShapes.forEach((s, i) => {
              const props = s.props;
              md += `## Question ${i + 1} (${props.marks || 1} marks)\n`;
              totalMarks += props.marks || 1;
              md += `${props.question || '(Empty Question)'}\n\n`;
              
              if (s.type === 'quiz-mcq-shape') {
                [props.option1, props.option2, props.option3, props.option4].forEach((opt, idx) => {
                  const isCorrect = props.correctOption === (idx + 1);
                  md += `- [${withAnswers && isCorrect ? 'X' : ' '}] ${opt || '(Empty Option)'}\n`;
                });
                if (withAnswers) md += `*Answer: Option ${['', 'A', 'B', 'C', 'D'][props.correctOption] || props.correctOption}*\n`;
                md += '\n';
              } else if (s.type === 'quiz-written-shape') {
                md += `*(Expected length: ${props.expectedLines || 5} lines)*\n\n`;
                for (let l = 0; l < (props.expectedLines || 5); l++) {
                  md += `__________________________________________________\n`;
                }
                if (withAnswers && props.expectedAnswer) {
                  md += `\n*Expected answer: ${props.expectedAnswer}*\n`;
                }
                md += '\n';
              }
            });
            
            md += `---\n**Total Marks: ${totalMarks}**\n`;
            return md;
          };
          
          const download = (content, name) => {
            const blob = new Blob([content], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            a.click();
            URL.revokeObjectURL(url);
          };

          const wantKey = window.confirm('Include the answer key in this export? (Cancel for a blank student paper without answers)');
          download(writeExam(wantKey), wantKey ? `Exam_AnswerKey_${Date.now()}.md` : `Exam_Paper_${Date.now()}.md`);
        }
      },

      'act-branch-top': { id: 'act-branch-top', label: 'Add Branch (Top)', readonlyOk: false, kbd: '', onSelect() { const selected = editor.getSelectedShapes(); if(selected[0]) MindMapNodeShapeUtil.spawnNodeAtAngle(editor, selected[0], 270); } },
      'act-branch-bottom': { id: 'act-branch-bottom', label: 'Add Branch (Bottom)', readonlyOk: false, kbd: '', onSelect() { const selected = editor.getSelectedShapes(); if(selected[0]) MindMapNodeShapeUtil.spawnNodeAtAngle(editor, selected[0], 90); } },
      'act-branch-left': { id: 'act-branch-left', label: 'Add Branch (Left)', readonlyOk: false, kbd: '', onSelect() { const selected = editor.getSelectedShapes(); if(selected[0]) MindMapNodeShapeUtil.spawnNodeAtAngle(editor, selected[0], 180); } },
      'act-branch-right': { id: 'act-branch-right', label: 'Add Branch (Right)', readonlyOk: false, kbd: '', onSelect() { const selected = editor.getSelectedShapes(); if(selected[0]) MindMapNodeShapeUtil.spawnNodeAtAngle(editor, selected[0], 0); } },
      'act-branch-custom': { id: 'act-branch-custom', label: 'Add Branch (Custom Angle...)', readonlyOk: false, kbd: '', onSelect() { const selected = editor.getSelectedShapes(); if(selected[0]) { const angle = prompt("Enter angle in degrees (0-360):", "45"); if (angle && !isNaN(Number(angle))) MindMapNodeShapeUtil.spawnNodeAtAngle(editor, selected[0], Number(angle)); } } },
      ...Object.fromEntries(['rounded', 'rectangle', 'circle', 'oval', 'rhombus', 'trapezium', 'dotted'].map(s => {
        const labelText = s === 'rounded' ? 'Rounded Rectangle' : (s.charAt(0).toUpperCase() + s.slice(1));
        return [
          `act-shape-${s}`, { id: `act-shape-${s}`, label: `Shape: ${labelText}`, readonlyOk: false, kbd: '', onSelect() { const sel = editor.getSelectedShapes(); if(sel[0]) editor.updateShape({ id: sel[0].id, type: sel[0].type, props: { nodeShape: s } }); } }
        ];
      })),
      ...Object.fromEntries([
        { id: 'rel-1-1', label: 'One to One', start: 'none', end: 'none', dash: 'draw' },
        { id: 'rel-1-many', label: 'One to Many', start: 'none', end: 'inverted', dash: 'draw' },
        { id: 'rel-many-1', label: 'Many to One', start: 'inverted', end: 'none', dash: 'draw' },
        { id: 'rel-many-many', label: 'Many to Many', start: 'inverted', end: 'inverted', dash: 'draw' },
        { id: 'rel-depends', label: 'Dependency (Dotted)', start: 'none', end: 'arrow', dash: 'dashed' }
      ].map(r => [
        `act-${r.id}`, { id: `act-${r.id}`, label: r.label, readonlyOk: false, kbd: '', onSelect() { const sel = editor.getSelectedShapes(); if(sel[0]) editor.updateShape({ id: sel[0].id, type: sel[0].type, props: { arrowheadStart: r.start, arrowheadEnd: r.end, dash: r.dash } }); } }
      ]))
    };

    Object.keys(NOTE_COLORS).forEach(color => {
      const colorCapitalized = color.charAt(0).toUpperCase() + color.slice(1);
      allActions[`color-${color}`] = {
        id: `color-${color}`,
        label: `Color: ${colorCapitalized}`,
        readonlyOk: false,
        kbd: '',
        onSelect(source) {
          const selected = editor.getSelectedShapes();
          selected.forEach(shape => {
            if (shape.type === 'milanote-card' || shape.type === 'milanote-list') {
              editor.updateShape({ id: shape.id, type: shape.type, props: { color } });
            }
          });
        }
      };
    });

    return allActions;
  },
  contextMenu(editor, contextMenu, { actions }) {
    const selected = editor.getSelectedShapes();
    
    if (selected.length === 1 && selected[0].type === 'mind-map-node') {
      contextMenu.unshift({
        id: 'mind-map-branch',
        type: 'submenu',
        label: 'Add Branch',
        children: [
          { type: 'item', actionItem: actions['act-branch-top'] },
          { type: 'item', actionItem: actions['act-branch-bottom'] },
          { type: 'item', actionItem: actions['act-branch-left'] },
          { type: 'item', actionItem: actions['act-branch-right'] },
          { type: 'item', actionItem: actions['act-branch-custom'] },
        ]
      }, {
        id: 'mind-map-shape',
        type: 'submenu',
        label: 'Change Shape',
        children: [
          { type: 'item', actionItem: actions['act-shape-rounded'] },
          { type: 'item', actionItem: actions['act-shape-rectangle'] },
          { type: 'item', actionItem: actions['act-shape-circle'] },
          { type: 'item', actionItem: actions['act-shape-oval'] },
          { type: 'item', actionItem: actions['act-shape-rhombus'] },
          { type: 'item', actionItem: actions['act-shape-trapezium'] },
          { type: 'item', actionItem: actions['act-shape-dotted'] },
        ]
      });
    }

    if (selected.length === 1 && selected[0].type === 'arrow') {
      contextMenu.unshift(
        { type: 'item', actionItem: actions['act-rel-1-1'] },
        { type: 'item', actionItem: actions['act-rel-1-many'] },
        { type: 'item', actionItem: actions['act-rel-many-1'] },
        { type: 'item', actionItem: actions['act-rel-many-many'] },
        { type: 'item', actionItem: actions['act-rel-depends'] }
      );
    }

    if (selected.length === 1 && (selected[0].type === 'milanote-file' || selected[0].type === 'milanote-folder')) {
      contextMenu.unshift({ type: 'item', actionItem: actions['rename-item'] });
    }

    if (selected.length === 0) {
      contextMenu.unshift({ type: 'item', actionItem: actions['create-file'] });
      
      const userRole = localStorage.getItem('userRole') || 'Casual';
      const userId = localStorage.getItem('userId');
      const isHost = userId && window['currentRoomHostId'] === userId;
      const canUseAdminTools = ['Teacher', 'Interviewer', 'Manager'].includes(userRole) || (userRole === 'Casual' && isHost);
      
      if (canUseAdminTools) {
        contextMenu.unshift({ type: 'item', actionItem: actions['export-exam'] });
      }
    }

    return contextMenu;
  }
};

const customComponents = {
  InFrontOfTheCanvas: CustomMultiplayerCursors,
  CursorChatBubble: () => null,
  SharePanel: null,
  MenuPanel: null,
  NavigationPanel: null,
  HelpMenu: null,
  DebugPanel: null,
  DebugMenu: null,
  Toolbar: null,
  StylePanel: null,
  MainMenu: null,
  PageMenu: null,
  ZoomMenu: null
};
export default function Board() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [userName, setUserName] = useState(() => localStorage.getItem('userName') || 'Anonymous');
  const [accentColor, setAccentColor] = useState(() => {
    const saved = localStorage.getItem('themeAccent');
    return saved ? JSON.parse(saved) : { id: 'periwinkle', hex: '#92a9e1', hover: '#92a9e1' };
  });

  // Yjs Sync Store
  const storeWithStatus = useYjsStore({
    roomId: id || 'global-moodboard',
    hostUrl: import.meta.env.VITE_YJS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/yjs`,
    userName: userName || 'Anonymous',
    userColor: '#ef4444',
    shapeUtils: customShapeUtils,
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [placingTemplate, setPlacingTemplate] = useState(null);
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });
  const [editor, setEditor] = useState(null);
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

  // Track how many quiz questions are on the board (for the Exam Editor dock).
  useEffect(() => {
    if (!editor) return;
    const updateCount = () => {
      const shapes = editor.getCurrentPageShapes();
      setQuizCount(shapes.filter(s => ['quiz-mcq-shape', 'quiz-written-shape', 'quiz-code-shape'].includes(s.type)).length);
    };
    updateCount();
    const unsub = editor.store.listen(updateCount, { scope: 'document' });
    return () => unsub();
  }, [editor]);

  const mousePos = useRef({ x: 0, y: 0 });
  useEffect(() => {
    if (!editor) return;
    const handlePointerMove = (e) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (storeWithStatus.provider && storeWithStatus.provider.awareness) {
        storeWithStatus.provider.awareness.setLocalStateField('cursor', {
          x: e.clientX,
          y: e.clientY,
          name: userName || 'Anonymous',
          color: editor.user.getUserPreferences().color || '#5865F2',
        });
      }
    };
    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [editor, storeWithStatus.provider, userName]);

  // Tldraw Toolbar sync
  const [activeTool, setActiveTool] = useState('select');
  const [activeColor, setActiveColor] = useState('black');
  const [activeSize, setActiveSize] = useState('m');
  const [activeFill, setActiveFill] = useState('none');
  const [activeDash, setActiveDash] = useState('draw');
  const [activeFont, setActiveFont] = useState('draw');
  const [activeAlign, setActiveAlign] = useState('middle');

  useEffect(() => {
    if (!editor) return;
    const handleChange = () => {
      const toolId = editor.getCurrentToolId();
      if (toolId === 'geo') {
        const geoType = editor.getStyleForNextShape(GeoShapeGeoStyle);
        setActiveTool(geoType || 'rectangle');
      } else {
        setActiveTool(toolId);
      }
      
      // Update color/size based on selection if possible, otherwise shared style
      const styles = editor.getSharedStyles();
      if (styles) {
        const colorStyle = styles.getAsKnownValue('color');
        if (colorStyle) setActiveColor(colorStyle);
        
        const sizeStyle = styles.getAsKnownValue('size');
        if (sizeStyle) setActiveSize(sizeStyle);

        const fillStyle = styles.getAsKnownValue('fill');
        if (fillStyle) setActiveFill(fillStyle);

        const dashStyle = styles.getAsKnownValue('dash');
        if (dashStyle) setActiveDash(dashStyle);

        const fontStyle = styles.getAsKnownValue('font');
        if (fontStyle) setActiveFont(fontStyle);

        const alignStyle = styles.getAsKnownValue('textAlign');
        if (alignStyle) setActiveAlign(alignStyle);
      }
    };
    editor.store.listen(handleChange, { source: 'user', scope: 'document' });
    // Also listen to app state changes for tool changes
    editor.on('change', handleChange);
    
    return () => {
       editor.off('change', handleChange);
    };
  }, [editor]);

  const handleSetActiveTool = (tool) => {
    if (!editor) return;
    if (hostLocked && !isActingHost) {
      setActiveTool('select');
      editor.setCurrentTool('select');
      alert('Drawing is locked by the host.');
      return;
    }
    if (tool === 'delete') {
      editor.deleteShapes(editor.getSelectedShapeIds());
      return;
    }
    
    const geoShapes = ['rectangle', 'ellipse', 'triangle', 'diamond', 'hexagon', 'oval', 'rhombus', 'star', 'cloud', 'heart', 'x-box', 'check-box', 'arrow-left', 'arrow-up', 'arrow-down', 'arrow-right'];
    
    if (geoShapes.includes(tool)) {
      editor.setCurrentTool('geo');
      editor.setStyleForNextShapes(GeoShapeGeoStyle, tool);
      editor.setStyleForSelectedShapes(GeoShapeGeoStyle, tool);
      setActiveTool(tool);
      return;
    }

    // Map tool names where they differ
    const toolMap = {
      'pan': 'hand',
      'pen': 'draw',
      'circle': 'ellipse',
      'diamond': 'rhombus',
      'highlight': 'highlight',
      'laser': 'laser'
    };
    
    const targetTool = toolMap[tool] || tool;
    
    try {
      editor.setCurrentTool(targetTool);
      setActiveTool(tool);
    } catch (e) {
      console.warn('Tool not found in Tldraw:', targetTool);
    }
  };

  const handleSetActiveColor = (color) => {
     setActiveColor(color);
     if (!editor) return;
     editor.setStyleForSelectedShapes(DefaultColorStyle, color);
     editor.setStyleForNextShapes(DefaultColorStyle, color);
  };
  
  const handleSetActiveSize = (size) => {
     setActiveSize(size);
     if (!editor) return;
     editor.setStyleForSelectedShapes(DefaultSizeStyle, size);
     editor.setStyleForNextShapes(DefaultSizeStyle, size);
  };

  const handleSetActiveFill = (fill) => {
     setActiveFill(fill);
     if (!editor) return;
     editor.setStyleForSelectedShapes(DefaultFillStyle, fill);
     editor.setStyleForNextShapes(DefaultFillStyle, fill);
  };

  const handleSetActiveDash = (dash) => {
     setActiveDash(dash);
     if (!editor) return;
     editor.setStyleForSelectedShapes(DefaultDashStyle, dash);
     editor.setStyleForNextShapes(DefaultDashStyle, dash);
  };

  const handleSetActiveFont = (font) => {
     setActiveFont(font);
     if (!editor) return;
     editor.setStyleForSelectedShapes(DefaultFontStyle, font);
     editor.setStyleForNextShapes(DefaultFontStyle, font);
  };

  const handleSetActiveAlign = (align) => {
     setActiveAlign(align);
     if (!editor) return;
     editor.setStyleForSelectedShapes(DefaultHorizontalAlignStyle, align);
     editor.setStyleForNextShapes(DefaultHorizontalAlignStyle, align);
  };
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

  useEffect(() => {
    const handleNavigate = (e) => {
      navigate(`/board/${e.detail}`);
    };
    const handleOpenFolder = (e) => {
      setActiveFolder({ folderId: e.detail.id, name: e.detail.name, files: [] });
    };
    const handleOpenBoard = (e) => {
      navigate(`/board/${e.detail.roomId}`);
    };
    const handleOpenVideoCall = () => {
      if (!isCallActive) joinCall('video');
      setIsCallHidden(false);
    };
    const handleOpenScreenShare = () => {
      if (!permsRef.current.share && !isActingHostRef.current) {
        alert('Screen sharing is disabled by the host.');
        return;
      }
      if (!isCallActive) joinCall('screen');
      setIsCallHidden(false);
    };
    const handleOpenExamWindow = (e) => {
      setExamWindow({ shapeId: e.detail.shapeId, name: e.detail.name });
    };
    
    window.addEventListener('navigate-to-room', handleNavigate);
    window.addEventListener('open-folder-manager', handleOpenFolder);
    window.addEventListener('open-board-viewer', handleOpenBoard);
    window.addEventListener('open-video-call', handleOpenVideoCall);
    window.addEventListener('open-screen-share', handleOpenScreenShare);
    window.addEventListener('open-exam-window', handleOpenExamWindow);
    return () => {
      window.removeEventListener('navigate-to-room', handleNavigate);
      window.removeEventListener('open-folder-manager', handleOpenFolder);
      window.removeEventListener('open-board-viewer', handleOpenBoard);
      window.removeEventListener('open-video-call', handleOpenVideoCall);
      window.removeEventListener('open-screen-share', handleOpenScreenShare);
      window.removeEventListener('open-exam-window', handleOpenExamWindow);
    };
  }, [navigate]);

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
    
    if (editor) {
      editor.user.updateUserPreferences({ colorScheme: mode, color: accentColor.hex });
    }
  }, [mode, boardType, accentColor, editor]);

  const handleSelectTemplate = (template) => {
    setPlacingTemplate(template);
    setShowTemplatesModal(false);
  };
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && placingTemplate) {
        setPlacingTemplate(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [placingTemplate]);

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
        }
      };
      fetchRoom();
    }
  }, [id, navigate]);

  // Track which users are present (for dynamic acting-host handoff).
  useEffect(() => {
    const awareness = storeWithStatus.provider?.awareness;
    if (!awareness) return;
    const update = () => {
      const ids = [];
      awareness.getStates().forEach((state) => {
        if (state && state.authUserId) ids.push(state.authUserId);
      });
      setPresentUserIds(ids);
    };
    awareness.on('update', update);
    update();
    return () => awareness.off('update', update);
  }, [storeWithStatus.provider]);

  // Recompute the acting host on every awareness/room change.
  useEffect(() => {
    const host = actingHostId(roomInfo, presentUserIds);
    setActingHost(host);
    window['currentRoomHostId'] = host || null;
  }, [roomInfo, presentUserIds]);

  const localClientId = storeWithStatus.provider?.awareness?.clientID;
  const isActingHost = actingHost === localUserId;

  // --- AUTO-ATTENDANCE TRACKER (15 MIN) ---
  const connectionTimesRef = useRef({});
  const autoMarkedRef = useRef(new Set());
  
  useEffect(() => {
    if (!isActingHost || !storeWithStatus.provider?.awareness) return;
    
    const interval = setInterval(async () => {
      const states = storeWithStatus.provider.awareness.getStates();
      const currentIds = new Set();
      
      states.forEach((state) => {
        if (state.presence && state.authUserId) {
          const uid = state.authUserId;
          currentIds.add(uid);
          connectionTimesRef.current[uid] = (connectionTimesRef.current[uid] || 0) + 10; // add 10 seconds
          
          // 15 minutes = 900 seconds
          if (connectionTimesRef.current[uid] >= 900 && !autoMarkedRef.current.has(uid)) {
            autoMarkedRef.current.add(uid);
            
            // Auto-mark in Firebase
            const todayKey = new Date().toISOString().slice(0, 10);
            const attRef = doc(db, 'rooms', id, 'attendance', todayKey);
            getDoc(attRef).then(snap => {
              const data = snap.exists() ? snap.data().students || {} : {};
              if (!data[uid]) {
                data[uid] = { name: state.presence.userName || uid, manual: false, auto: true };
                setDoc(attRef, { date: todayKey, students: data, updatedAt: new Date().toISOString() }, { merge: true });
              }
            }).catch(console.error);
          }
        }
      });
      
      // Optional: reset disconnected users? No, they keep their cumulative time for the day.
    }, 10000); // 10 seconds
    
    return () => clearInterval(interval);
  }, [isActingHost, storeWithStatus.provider, id]);
  // ----------------------------------------

  // Refs mirror host-lock/perm state so memoized callbacks never read stale values.
  const hostLockedRef = useRef(hostLocked);
  const permsRef = useRef(perms);
  const isActingHostRef = useRef(isActingHost);
  useEffect(() => { hostLockedRef.current = hostLocked; }, [hostLocked]);
  useEffect(() => { permsRef.current = perms; }, [perms]);
  useEffect(() => { isActingHostRef.current = isActingHost; }, [isActingHost]);

  // Receive + apply host commands (lock, perms, bringAllToMe, clearBoard, mute, ...).
  useEffect(() => {
    const provider = storeWithStatus.provider;
    if (!provider || !provider.awareness || !actingHost) return;
    const apply = (action) => {
      const { cmd, target } = action;
      const isMine = target === 'all' || target === localClientId;
      switch (cmd) {
        case 'lock': setHostLocked(true); break;
        case 'unlock': setHostLocked(false); break;
        case 'allowMic': setPerms(p => ({ ...p, mic: true })); break;
        case 'blockMic': setPerms(p => ({ ...p, mic: false })); if (isMine) setIsMicMuted(true); break;
        case 'allowShare': setPerms(p => ({ ...p, share: true })); break;
        case 'blockShare': setPerms(p => ({ ...p, share: false })); if (isMine && callMode === 'screen') leaveCall(); break;
        case 'allowFiles': setPerms(p => ({ ...p, files: true })); break;
        case 'blockFiles': setPerms(p => ({ ...p, files: false })); break;
        case 'allowCopyPaste': setPerms(p => ({ ...p, copyPaste: true })); break;
        case 'blockCopyPaste': setPerms(p => ({ ...p, copyPaste: false })); break;
        case 'muteAll': if (isMine) setIsMicMuted(true); break;
        case 'mute': if (isMine) setIsMicMuted(true); break;
        case 'askCamera': if (isMine) alert('The host is asking you to turn on your camera.'); break;
        case 'askMic': if (isMine) alert('The host is asking you to unmute your microphone.'); break;
        case 'kick': if (isMine) { alert('You have been kicked by the host.'); navigate('/dashboard'); } break;
        case 'bringAllToMe': if (isMine && editor && action.x != null) {
          editor.setCamera({ x: action.x, y: action.y, z: action.z || 1 }, { animation: { duration: 400 } });
        } break;
        case 'clearBoard': if (isMine && editor) {
          const shapes = editor.getCurrentPageShapes().filter(s => !s.isLocked);
          if (shapes.length) editor.deleteShapes(shapes.map(s => s.id));
        } break;
        default: break;
      }
    };
    const handle = () => sweepHostActions(provider, actingHost, localClientId, apply);
    provider.awareness.on('update', handle);
    handle();
    return () => provider.awareness.off('update', handle);
  }, [storeWithStatus.provider, actingHost, localClientId, editor, callMode, navigate]);

  // Enforce the drawing lock natively (readonly instance state is local-only, not Yjs-synced).
  useEffect(() => {
    if (!editor) return;
    const locked = hostLocked && !isActingHost;
    const state = editor.getInstanceState();
    if (!!state.isReadonly !== locked) {
      editor.store.put([{ ...state, isReadonly: locked }]);
    }
  }, [editor, hostLocked, isActingHost]);

  // Block copy/paste when the host disables it for everyone but the host.
  useEffect(() => {
    if (!editor || perms.copyPaste || isActingHost) return;
    const handler = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
        e.preventDefault();
        e.stopPropagation();
        alert('Copy, cut and paste are disabled by the host.');
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [editor, perms.copyPaste, isActingHost]);

  // Block drag-dropped file uploads when the host disables file access.
  useEffect(() => {
    if (perms.files || isActingHost) return;
    const onDrop = (e) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
        e.preventDefault();
        e.stopPropagation();
        alert('File uploads are disabled by the host.');
      }
    };
    const onDragOver = (e) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
        e.preventDefault();
      }
    };
    window.addEventListener('drop', onDrop, true);
    window.addEventListener('dragover', onDragOver, true);
    return () => {
      window.removeEventListener('drop', onDrop, true);
      window.removeEventListener('dragover', onDragOver, true);
    };
  }, [perms.files, isActingHost]);

  // Exam rooms: auto-open the test editor for the assigned teacher.
  const userRole = localStorage.getItem('userRole') || 'Casual';
  const isExamRoom = roomInfo?.kind === 'exam';
  const isExamTeacher = isExamRoom && (isTeacherRole(userRole) || isAssignedTeacher(roomInfo, localUserId));
  useEffect(() => {
    if (isExamTeacher) setExamEditMode(true);
  }, [isExamTeacher]);

  useEffect(() => {
    if (!editor) return;

    const handleSpawnPreview = (e) => {
      const { url, name, ext, pages, originShapeId, isCloudFile, content } = e.detail;
      const originShape = editor.getShape(originShapeId);
      if (!originShape) return;
      setActivePreviewFile({ url, name, ext, fileId: e.detail.fileId, isCloudFile, content, originShapeId });
    };

    const handleSpawnFolder = (e) => {
      setActiveFolder(e.detail);
    };

    const handleSpawnChartEditor = (e) => {
      setActiveChartEditor(e.detail);
    };

    const handleSpawnHtmlPreviewCard = (e) => {
      const { originShapeId, content, name } = e.detail;
      const originShape = editor.getShape(originShapeId);
      if (!originShape) return;
      
      const newShapeId = createShapeId();
      editor.createShape({
        id: newShapeId,
        type: 'milanote-html-preview',
        x: originShape.x + originShape.props.w + 100,
        y: originShape.y,
        props: {
          name: name,
          content: content
        }
      });
      
      const arrowId = createShapeId();
      editor.createShape({
        id: arrowId,
        type: 'arrow',
        x: originShape.x + originShape.props.w / 2,
        y: originShape.y + originShape.props.h / 2,
        props: {
          start: { x: 0, y: 0 },
          end: { x: 100, y: 0 }
        }
      });
      
      editor.createBinding({
        type: 'arrow',
        fromId: arrowId,
        toId: originShapeId,
        props: { terminal: 'start', normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false }
      });
      
      editor.createBinding({
        type: 'arrow',
        fromId: arrowId,
        toId: newShapeId,
        props: { terminal: 'end', normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false }
      });
    };

    const handleProfileUpdate = (e) => {
      const newName = e.detail;
      setUserName(newName);
      if (editor) {
        editor.user.updateUserPreferences({ name: newName });
      }
    };

    const handleUpdateRole = async (e) => {
      if (!id || !roomInfo) return;
      const { targetId, role } = e.detail;
      try {
        const roomRef = doc(db, 'rooms', id);
        await updateDoc(roomRef, {
          [`roles.${targetId}`]: role
        });
        setRoomInfo(prev => ({
          ...prev,
          roles: {
            ...prev?.roles,
            [targetId]: role
          }
        }));
      } catch (err) {
        console.error("Failed to update role:", err);
      }
    };

    window.addEventListener('spawn-preview', handleSpawnPreview);
    window.addEventListener('spawn-folder-view', handleSpawnFolder);
    window.addEventListener('spawn-chart-editor', handleSpawnChartEditor);
    window.addEventListener('spawn-html-preview-card', handleSpawnHtmlPreviewCard);
    window.addEventListener('profile-updated', handleProfileUpdate);
    window.addEventListener('update-role', handleUpdateRole);
    return () => {
      window.removeEventListener('spawn-preview', handleSpawnPreview);
      window.removeEventListener('spawn-folder-view', handleSpawnFolder);
      window.removeEventListener('spawn-chart-editor', handleSpawnChartEditor);
      window.removeEventListener('spawn-html-preview-card', handleSpawnHtmlPreviewCard);
      window.removeEventListener('profile-updated', handleProfileUpdate);
      window.removeEventListener('update-role', handleUpdateRole);
    };
  }, [editor, id, roomInfo]);

  const handleMount = useCallback((editorInstance) => {
    setEditor(editorInstance);
    
    // Intercept deleteShapes to prevent the eraser from deleting important UI elements,
    // but allow it to erase shapes drawn by the pen ('draw') and highlighter ('highlight').
    const originalDeleteShapes = editorInstance.deleteShapes;
    editorInstance.deleteShapes = (ids) => {
      const currentTool = editorInstance.getCurrentToolId();
      if (currentTool === 'eraser') {
        const allowedIds = ids.filter(id => {
          const shape = editorInstance.getShape(id);
          return shape && (shape.type === 'draw' || shape.type === 'highlight');
        });
        if (allowedIds.length > 0) {
          return originalDeleteShapes.call(editorInstance, allowedIds);
        }
        return;
      }
      return originalDeleteShapes.call(editorInstance, ids);
    };

    // Template Anti-Overlap Physics on Drag & Drop
    const findSafeLocation = (targetX, targetY, myW, myH, existingShapes) => {
      let radius = 0;
      const step = 200;
      const margin = 50;
      while (radius < 5000) {
        // Evaluate points in a circle (or just the origin if radius is 0)
        const angles = radius === 0 ? [0] : [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, 5*Math.PI/4, 3*Math.PI/2, 7*Math.PI/4];
        for (const angle of angles) {
          const testX = targetX + radius * Math.cos(angle);
          const testY = targetY + radius * Math.sin(angle);
          const testRight = testX + myW;
          const testBottom = testY + myH;
          
          let hasCollision = false;
          for (const other of existingShapes) {
            const otherW = other.props?.w || 1000;
            const otherH = other.props?.h || 1000;
            const otherRight = other.x + otherW;
            const otherBottom = other.y + otherH;
            
            const intersect = !(testRight + margin <= other.x || testX >= otherRight + margin || testBottom + margin <= other.y || testY >= otherBottom + margin);
            if (intersect) {
              hasCollision = true;
              break;
            }
          }
          if (!hasCollision) return { x: testX, y: testY };
        }
        radius += step;
      }
      return { x: targetX, y: targetY };
    };
    editorInstance.sideEffects.registerAfterChangeHandler('shape', (prev, next, source) => {
      if (source !== 'user') return;
      const templateTypes = [
        'brand-guidelines', 'vision-board', 'weekly-planner', 'empathy-map', 'brain-dump',
        'eisenhower-matrix', 'business-model-canvas', 'timeline', 'product-design', 'user-storymap', 'customer-journey', 'retrospective'
      ];
      if (!templateTypes.includes(next.type)) return;
      
      if (prev.x !== next.x || prev.y !== next.y) {
        const shapes = editorInstance.getCurrentPageShapes().filter(s => s.id !== next.id && templateTypes.includes(s.type));
        const myW = next.props?.w || 1000;
        const myH = next.props?.h || 1000;
        const safeLoc = findSafeLocation(next.x, next.y, myW, myH, shapes);
        const newX = safeLoc.x;
        const newY = safeLoc.y;
        
        if (newX !== next.x || newY !== next.y) {
           setTimeout(() => {
              editorInstance.updateShape({ id: next.id, type: next.type, props: next.props, x: newX, y: newY });
           }, 0);
        }
      }
    });
    
    editorInstance.updateInstanceState({ isGridMode: true });
    editorInstance.user.updateUserPreferences({ 
      name: userName || 'Anonymous',
      color: '#ef4444' 
    });
    
    // Set base point using the current camera position
    if (storeWithStatus.provider && storeWithStatus.provider.awareness) {
      storeWithStatus.provider.awareness.setLocalStateField('cursor', {
        x: editorInstance.getCamera().x,
        y: editorInstance.getCamera().y,
        name: userName || 'Anonymous',
        color: '#ef4444'
      });
    }

    // --- Persistent server-side upload (primary) ---
    const uploadToBackend = async (file) => {
      const token = localStorage.getItem('token');
      const form = new FormData();
      form.append('file', file);
      const baseUrl = '';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      try {
        const res = await fetch(`${baseUrl}/api/upload`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!res.ok) throw new Error(`Backend upload failed: ${res.status}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Upload failed');
        return { url: data.url, name: data.name, fileId: data.fileId };
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    };

    // --- Persistent server-side PPT conversion ---
    const convertPptToPdf = async (file) => {
      const token = localStorage.getItem('token');
      const form = new FormData();
      form.append('file', file);
      const baseUrl = '';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for conversion
      
      try {
        const res = await fetch(`${baseUrl}/api/convert-ppt-to-pdf`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!res.ok) throw new Error(`Backend conversion failed: ${res.status}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Conversion failed');
        return { url: data.url, name: data.name, fileId: data.fileId };
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    };

    // Try conversion first (if PPT), then backend, then Firebase
    const uploadAnywhere = async (file) => {
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'ppt' || ext === 'pptx') {
        try {
          return await convertPptToPdf(file);
        } catch (convertErr) {
          console.warn('PPT conversion failed, falling back to standard upload:', convertErr);
        }
      }

      try {
        return await uploadToBackend(file);
      } catch (backendErr) {
        console.warn('Backend upload failed, trying Firebase:', backendErr);
        const url = await uploadToFirebase(file);
        return { url, name: file.name, fileId: file.name };
      }
    };

    // --- Firebase Storage Asset Handler (fallback) ---
    const uploadToFirebase = async (file) => {
      if (!file) return null;
      setIsUploading(true);
      try {
        const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;
        const storageRef = ref(storage, `board_assets/${id}/${uniqueFileName}`);
        
        // Add a timeout to prevent infinite hanging if Firebase isn't configured correctly
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        await Promise.race([
          uploadTask,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase upload timeout')), 10000))
        ]);
        
        const downloadURL = await getDownloadURL(storageRef);
        setIsUploading(false);
        return downloadURL;
      } catch (err) {
        console.error("Firebase upload failed", err);
        setIsUploading(false);
        throw err;
      }
    };

    editorInstance.registerExternalAssetHandler('image', async ({ file }) => {
      const { url } = await uploadAnywhere(file);
      return { type: 'image', src: url, isAnimated: file.type === 'image/gif' };
    });

    editorInstance.registerExternalAssetHandler('video', async ({ file }) => {
      const { url } = await uploadAnywhere(file);
      return { type: 'video', src: url, isAnimated: true };
    });

    editorInstance.registerExternalAssetHandler('file', async ({ file }) => {
      const { url } = await uploadAnywhere(file);
      // Create a milanote-file shape for generic files since Tldraw doesn't handle them naturally
      const center = editorInstance.getViewportPageBounds().center;
      editorInstance.createShape({
        type: 'milanote-file',
        x: center.x,
        y: center.y,
        props: { name: file.name, isCloudFile: false, url: url, content: '' }
      });
      return null; // Prevents Tldraw from creating an unknown asset
    });
    
    editorInstance.registerExternalContentHandler('files', async ({ files, point }) => {
      if (files && files.length > 0) {
        const file = files[0];
        const dropPoint = point ?? editorInstance.getViewportPageBounds().center;
        const ext = file.name.split('.').pop().toLowerCase();
        const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
        const isVideo = ['mp4', 'webm', 'mov'].includes(ext);

        // Local fallback: store the file inline in the document so it persists.
        // Images are stored as base64 data URLs (NOT session-only blob: URLs).
        const handleLocalFallback = (tempShapeId) => {
           setIsUploading(false);
           if (isImage) {
              const reader = new FileReader();
              reader.onload = (e) => {
                const downloadURL = String(e.target.result); // base64 data URL (persists in doc)
                const img = new Image();
                img.onload = () => {
                  const assetId = AssetRecordType.createId();
                  editorInstance.createAssets([{
                    id: assetId,
                    type: 'image',
                    typeName: 'asset',
                    props: {
                      name: file.name,
                      src: downloadURL,
                      w: img.width,
                      h: img.height,
                      mimeType: file.type || 'image/png',
                      isAnimated: file.name.toLowerCase().endsWith('.gif'),
                    },
                    meta: {}
                  }]);
                  editorInstance.createShape({
                    type: 'image',
                    x: dropPoint.x - (img.width / 2),
                    y: dropPoint.y - (img.height / 2),
                    props: {
                      assetId: assetId,
                      w: img.width,
                      h: img.height,
                    }
                  });
                };
                img.src = downloadURL;
              };
            reader.readAsDataURL(file);
         } else if (isVideo) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const downloadURL = String(e.target.result);
              const assetId = AssetRecordType.createId();
              editorInstance.createAssets([{
                id: assetId,
                type: 'video',
                typeName: 'asset',
                props: {
                  name: file.name,
                  src: downloadURL,
                  w: 640,
                  h: 360,
                  mimeType: file.type || 'video/mp4',
                  isAnimated: true,
                },
                meta: {}
              }]);
              editorInstance.createShape({
                type: 'video',
                x: dropPoint.x - 320,
                y: dropPoint.y - 180,
                props: {
                  assetId: assetId,
                  w: 640,
                  h: 360,
                }
              });
            };
            reader.readAsDataURL(file);
         } else {
              const isText = ['js', 'jsx', 'ts', 'tsx', 'py', 'html', 'css', 'json', 'cpp', 'c', 'java', 'go', 'rs', 'txt', 'md', 'csv'].includes(ext);
              const reader = new FileReader();
              reader.onload = (e) => {
                 editorInstance.updateShape({
                   id: tempShapeId,
                   type: 'milanote-file',
                   props: {
                     name: file.name,
                     url: isText ? '' : String(e.target.result),
                     content: isText ? String(e.target.result) : '',
                     isCloudFile: false
                   }
                 });
              };
              if (isText) {
                reader.readAsText(file);
              } else {
                reader.readAsDataURL(file);
              }
           }
        };

        // Optimistic UI for files (instantly place a loading shape)
        const tempShapeId = createShapeId();
        
        try {
          setIsUploading(true);
          setUploadMessage(`Uploading ${file.name}...`);

          const isText = ['js', 'jsx', 'ts', 'tsx', 'py', 'html', 'css', 'json', 'cpp', 'c', 'java', 'go', 'rs', 'txt', 'md', 'csv'].includes(ext);
          
          if (!isImage && !isVideo) {
             editorInstance.createShape({
                id: tempShapeId,
                type: 'milanote-file',
                x: dropPoint.x - 80,
                y: dropPoint.y - 60,
                props: {
                  name: `Uploading ${file.name}...`,
                  url: '',
                  content: '',
                  isCloudFile: false
                }
             });
          }

          const { url: downloadURL, name: finalName } = await uploadAnywhere(file);
          setIsUploading(false);

          // Save to recent files in Firestore
          const userEmail = localStorage.getItem('userEmail');
          if (userEmail) {
            try {
              const recentRef = collection(db, 'users', userEmail, 'recentFiles');
              await addDoc(recentRef, {
                name: file.name,
                size: (file.size / 1024 / 1024).toFixed(2) + 'MB',
                type: ext,
                url: downloadURL,
                timestamp: serverTimestamp()
              });
            } catch(err) {
              console.error("Failed to save to recent files", err);
            }
          }

          if (isImage) {
            const img = new Image();
            img.onload = () => {
              const assetId = AssetRecordType.createId();
              editorInstance.createAssets([{
                id: assetId,
                type: 'image',
                typeName: 'asset',
                props: {
                  name: finalName || file.name,
                  src: downloadURL,
                  w: img.width,
                  h: img.height,
                  mimeType: file.type || 'image/png',
                  isAnimated: file.name.toLowerCase().endsWith('.gif'),
                },
                meta: {}
              }]);
              editorInstance.createShape({
                type: 'image',
                x: dropPoint.x - (img.width / 2),
                y: dropPoint.y - (img.height / 2),
                props: {
                  assetId: assetId,
                  w: img.width,
                  h: img.height,
                }
              });
            };
            img.src = downloadURL;
          } else if (isVideo) {
            const assetId = AssetRecordType.createId();
            editorInstance.createAssets([{
              id: assetId,
              type: 'video',
              typeName: 'asset',
              props: {
                name: finalName || file.name,
                src: downloadURL,
                w: 640,
                h: 360,
                mimeType: file.type || 'video/mp4',
                isAnimated: true,
              },
              meta: {}
            }]);
            editorInstance.createShape({
              type: 'video',
              x: dropPoint.x - 320,
              y: dropPoint.y - 180,
              props: {
                assetId: assetId,
                w: 640,
                h: 360,
              }
            });
          } else {
            // Update the optimistic shape
            if (isText) {
              // Fetch the text content so it works perfectly in CodeRunner
              try {
                const res = await fetch(downloadURL);
                const text = await res.text();
                editorInstance.updateShape({
                  id: tempShapeId,
                  type: 'milanote-file',
                  props: {
                    name: finalName || file.name,
                    url: downloadURL,
                    content: text,
                    isCloudFile: false
                  }
                });
              } catch(e) {
                editorInstance.updateShape({
                  id: tempShapeId,
                  type: 'milanote-file',
                  props: {
                    name: finalName || file.name,
                    url: downloadURL,
                    isCloudFile: false
                  }
                });
              }
            } else {
               // Fast path for binaries (PDF, Excel, PPT)
               editorInstance.updateShape({
                  id: tempShapeId,
                  type: 'milanote-file',
                  props: {
                    name: finalName || file.name,
                    url: downloadURL,
                    content: '',
                    isCloudFile: false
                  }
               });
            }
          }
        } catch (e) {
          console.error(e);
          handleLocalFallback(tempShapeId);
        }
      }
    });
  }, []);

  const addShape = useCallback((type, chartTypeParam) => {
    if (!editor) return;
    if (hostLockedRef.current && !isActingHostRef.current) {
      alert('Drawing is locked by the host.');
      return;
    }
    if ((type === 'milanote-file' || type === 'exam-file') && !permsRef.current.files && !isActingHostRef.current) {
      alert('File uploads are disabled by the host.');
      return;
    }
    
    if (type === 'milanote-board') {
       handleCreateNestedBoardRoom();
       return;
    }

    let props = undefined;
    if (type === 'milanote-file' || type === 'exam-file') {
      setPromptConfig({
        title: type === 'exam-file' ? 'Enter test file name (e.g. Unit_Test_1.test):' : 'Enter Notebook name (extension not required):',
        defaultValue: type === 'exam-file' ? 'New_Test.test' : 'New_Notebook',
        onSubmit: (name) => {
          if (!name) return;
          if (type === 'milanote-file') {
            name = name.trim();
            if (!name.endsWith('.ipynb')) name += '.ipynb';
          }
          const center = editor.getViewportPageBounds().center;
          editor.createShape({
            id: createShapeId(),
            type,
            x: center.x - 125,
            y: center.y - 100,
            props: { name }
          });
        }
      });
      return;
    } else if (type === 'milanote-chart') {
      props = { chartType: chartTypeParam || 'bar' };
    }

    const center = editor.getViewportPageBounds().center;
    editor.createShape({
      type: type,
      x: center.x - 125,
      y: center.y - 100,
      ...(props !== undefined && { props })
    });
  }, [editor]);

  const handleCreateNestedBoardRoom = async () => {
    setPromptConfig({
      title: 'Enter nested board name:',
      defaultValue: 'New Board',
      onSubmit: async (boardName) => {
        if (!boardName) return;
        try {
          const newRoomId = Math.random().toString(36).substring(2, 8) + '-' + Math.random().toString(36).substring(2, 8);
          const roomRef = doc(db, 'rooms', newRoomId);
          await setDoc(roomRef, {
            name: boardName,
            kind: 'board',
            hostId: localUserId,
            hostName: localStorage.getItem('userName') || 'Anonymous',
            createdBy: localUserId,
            createdByRole: localStorage.getItem('userRole') || 'Casual',
            roles: { [localUserId]: 'admin' },
            createdAt: serverTimestamp(),
            parentId: id // the current room is the parent
          });
          
          // Save to local history
          addRoomToHistory(newRoomId, boardName, id, 'board');

          // Spawn the shape
          const center = editor.getViewportPageBounds().center;
          editor.createShape({
            type: 'milanote-board',
            x: center.x - 125,
            y: center.y - 100,
            props: { name: boardName, roomId: newRoomId }
          });
          // Note: Removed immediate navigation so user can use the card.
        } catch (e) {
          alert('Failed to create nested board: ' + e.message);
        }
      }
    });
  };



  if (storeWithStatus.status === 'loading' || !storeWithStatus.store) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#121212', color: 'white' }}>
        <Loader2 size={32} className="spin" />
        <span style={{ marginLeft: '12px' }}>Connecting to Multiplayer Room...</span>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Top Bar Navigation (Top left corner) */}
      <TopBar 
        editor={editor} 
        provider={storeWithStatus.provider} 
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

      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        
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
          onUploadFile={() => {
            if (!perms.files && !isActingHost) {
              alert('File uploads are disabled by the host.');
              return;
            }
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '*/*'; 
            input.multiple = true;
            input.onchange = (e) => {
              const target = /** @type {HTMLInputElement} */ (e.target);
              if (target.files && target.files.length > 0) {
                 editor.putExternalContent({ type: 'files', files: Array.from(target.files), point: editor.getViewportPageBounds().center, ignoreParent: false });
              }
            };
            input.click();
          }}
        />
      )}

      <div style={{ flex: 1, position: 'relative' }}>
        {placingTemplate && (
          <div 
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 9999, cursor: 'crosshair',
              background: 'transparent'
            }}
            onPointerMove={(e) => {
               const rect = e.currentTarget.getBoundingClientRect();
               setGhostPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            }}
            onPointerDown={(e) => {
              if (!editor) return;
              const point = editor.screenToPage({ x: e.clientX, y: e.clientY });
              
              const templateTypes = [
                'brand-guidelines', 'vision-board', 'weekly-planner', 'empathy-map', 'brain-dump',
                'eisenhower-matrix', 'business-model-canvas', 'timeline', 'product-design', 'user-storymap', 'customer-journey', 'retrospective'
              ];
              const existingTemplates = editor.getCurrentPageShapes().filter(s => templateTypes.includes(s.type));
              
              const shapes = placingTemplate.createShapes(point);
              editor.createShapes(shapes);
              setPlacingTemplate(null);
              
              // Check collision for spawned templates
              const findSafeLocation = (x, y, w, h, shapes) => { return {x, y}; };
              const newShape = shapes[0];
              if (newShape && templateTypes.includes(newShape.type)) {
                 const myW = newShape.props?.w || 1000;
                 const myH = newShape.props?.h || 1000;
                 const safeLoc = findSafeLocation(newShape.x, newShape.y, myW, myH, existingTemplates);
                 const newX = safeLoc.x;
                 const newY = safeLoc.y;
                 if (newX !== newShape.x || newY !== newShape.y) {
                    editor.updateShape({ id: newShape.id, type: newShape.type, props: newShape.props, x: newX, y: newY });
                 }
              }
            }}
          >
            <div style={{
               position: 'absolute',
               left: ghostPos.x,
               top: ghostPos.y,
               transform: 'translate(-50%, -50%)',
               pointerEvents: 'none',
               border: '2px dashed var(--color-text)',
               background: 'rgba(88, 101, 242, 0.1)',
               padding: '40px 80px',
               borderRadius: '16px',
               display: 'flex',
               flexDirection: 'column',
               alignItems: 'center',
               justifyContent: 'center',
               backdropFilter: 'none',
               boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
            }}>
              <span style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--color-text)' }}>{placingTemplate.name}</span>
              <span style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginTop: '8px' }}>Click anywhere to place</span>
            </div>
          </div>
        )}
        <div style={{ 
          width: '100%', 
          height: '100%', 
          visibility: (isCallActive && !isCallHidden) ? 'hidden' : 'visible',
          opacity: (isCallActive && !isCallHidden) ? 0 : 1,
          pointerEvents: (isCallActive && !isCallHidden) ? 'none' : 'auto',
          transition: 'opacity 0.2s'
        }}>
          <Tldraw
            store={storeWithStatus.store}
            shapeUtils={customShapeUtils}
            onMount={handleMount}
            components={customComponents}
            overrides={customUiOverrides}
          />
        </div>

        {/* Neo-Brutalist Bottom Toolbar & Style Panel */}
        {!isExamRoom && (!isCallActive || isCallHidden) && (
          <>
            <BottomToolbar activeTool={activeTool} setActiveTool={handleSetActiveTool} addShape={addShape} />
            <StylePanel 
              activeColor={activeColor} setActiveColor={handleSetActiveColor} 
              activeSize={activeSize} setActiveSize={handleSetActiveSize} 
              activeFill={activeFill} setActiveFill={handleSetActiveFill}
              activeDash={activeDash} setActiveDash={handleSetActiveDash}
              activeFont={activeFont} setActiveFont={handleSetActiveFont}
              activeAlign={activeAlign} setActiveAlign={handleSetActiveAlign}
            />
          </>
        )}

        {isUploading && (
           <div style={{ position: 'absolute', top: 20, right: 20, background: '#3b82f6', color: 'white', padding: '12px 24px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000 }}>
             <Loader2 size={18} className="spin" />
             <span style={{ fontWeight: 500 }}>Processing File...</span>
           </div>
        )}
      </div>

      {activePreviewFile && (
        <FileViewerModal 
          fileData={activePreviewFile} 
          boardName={roomInfo?.name || 'Untitled'}
          folderFiles={editor.getCurrentPageShapes().filter(s => s.type === 'milanote-file').map(s => ({ id: s.id, name: s.props.name, content: s.props.content, url: s.props.url }))}
          onClose={() => setActivePreviewFile(null)}
          editor={editor}
          onSaveCloudFile={(newContent) => {
            if (activePreviewFile.originShapeId) {
              editor.updateShape({
                id: activePreviewFile.originShapeId,
                type: 'milanote-file',
                props: { content: newContent }
              });
              setActivePreviewFile({ ...activePreviewFile, content: newContent });
            }
          }}
          onCreateCloudFile={() => {
            if (activePreviewFile.originShapeId) {
              setPendingFileLinkParentId(activePreviewFile.originShapeId);
              setShowChoiceFileModal(true);
            }
          }}
          onOpenFile={(file) => {
              setActivePreviewFile({
                url: file.url,
                name: file.name,
                ext: file.name.split('.').pop().toLowerCase(),
                fileId: file.id || file.fileId,
                isCloudFile: file.isCloudFile || false,
                content: file.content,
                originShapeId: file.id || file.fileId
              });
            }}
        />
      )}

      {showChoiceFileModal && (
        <ChoiceFileModal 
          onClose={() => setShowChoiceFileModal(false)}
          onFileSelect={(files) => {
            setShowChoiceFileModal(false);
            const center = editor.getViewportPageBounds().center;
            
            let parentShape = null;
            if (pendingFileLinkParentId) {
              parentShape = editor.getShape(pendingFileLinkParentId);
            }

            files.forEach((file, index) => {
              // eslint-disable-next-line no-undef
              const newShapeId = editor.createShapeId ? editor.createShapeId() : `shape:${Math.random().toString(36).substr(2, 9)}`;
              
              let x = center.x - 125 + (index * 20);
              let y = center.y - 100 + (index * 20);
              
              if (parentShape) {
                 x = parentShape.x + 200 + (index * 20);
                 y = parentShape.y + (index * 60);
              }
              
              editor.createShape({
                id: newShapeId,
                type: 'milanote-file',
                x,
                y,
                props: { name: file.name, isCloudFile: true, url: file.url || '', content: '' }
              });
              
              if (parentShape) {
                 const arrowId = editor.createShapeId ? editor.createShapeId() : `shape:${Math.random().toString(36).substr(2, 9)}`;
                 editor.createShape({
                    id: arrowId,
                    type: 'arrow',
                    props: {
                       start: { type: 'binding', boundShapeId: parentShape.id, normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false },
                       end: { type: 'binding', boundShapeId: newShapeId, normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false }
                    }
                 });
              }
            });
            
            if (pendingFileLinkParentId) setPendingFileLinkParentId(null);
          }}
          onFileUpload={(files) => {
            setShowChoiceFileModal(false);
            editor.putExternalContent({ type: 'files', files: Array.from(files), point: editor.getViewportPageBounds().center, ignoreParent: false });
          }}
        />
      )}

      {showTemplatesModal && (
        <TemplatesModal 
          onClose={() => setShowTemplatesModal(false)}
          onSelectTemplate={handleSelectTemplate}
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
          editor={editor}
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
          editor={editor}
        />
      )}

      {/* Teacher Tools Modals */}
      {showHostControls && (
        <HostControlPanel
          onClose={() => setShowHostControls(false)}
          provider={storeWithStatus.provider}
          localClientId={localClientId}
          perms={perms}
          setPerms={(val) => setPerms(val)}
          hostLocked={hostLocked}
          setHostLocked={(val) => setHostLocked(val)}
          editor={editor}
        />
      )}
      {showClassSettings && <ClassSettingsModal roomId={id} onClose={() => setShowClassSettings(false)} />}
      {showRoster && <RosterModal roomId={id} onClose={() => setShowRoster(false)} />}
      {showAttendance && <AttendanceModal roomId={id} provider={storeWithStatus.provider} onClose={() => setShowAttendance(false)} />}
      {examWindow && (
        <ExamWindowModal
          roomId={id}
          examName={examWindow.name}
          onClose={() => setExamWindow(null)}
          onEdit={() => {
            setExamEditMode(true);
            if (editor && examWindow.shapeId) {
              const s = editor.getShape(examWindow.shapeId);
              if (s) editor.zoomToShapes([s.id], { animation: { duration: 400 } });
            }
          }}
        />
      )}

      {/* Exam Editor dock */}
      {examEditMode && (
        <div style={{ position: 'fixed', top: '70px', left: '50%', transform: 'translateX(-50%)', zIndex: 100000, display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--accent-green)', border: '3px solid #000', boxShadow: '4px 4px 0 #000', padding: '8px 14px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ fontWeight: '900', fontSize: '13px', textTransform: 'uppercase' }}>📝 Test Editor</span>
          <span className="neo-badge" style={{ background: quizCount > 0 ? 'var(--accent-yellow)' : '#FFB7B2', fontSize: '12px' }}>
            {quizCount} question{quizCount === 1 ? '' : 's'}
          </span>
          {quizCount === 0 && (
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#b02a37' }}>
              Add at least one question — students can't start an empty test.
            </span>
          )}
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
        <AddQuestionModal editor={editor} onClose={() => setShowAddQuestion(false)} />
      )}

      {/* Student details form editor */}
      {showAuthFields && (
        <AuthFieldsEditorModal roomId={id} onClose={() => setShowAuthFields(false)} />
      )}

      {/* Prompt Modal */}
      {promptConfig && (
        <div className="modal-overlay" onClick={() => setPromptConfig(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div className="neo-window" onClick={e => e.stopPropagation()} style={{ width: '400px' }}>
            <div className="neo-window-header" style={{ background: 'var(--accent-pink)' }}>
              <span style={{ fontWeight: '900', textTransform: 'uppercase' }}>Input Required</span>
            </div>
            <div className="neo-window-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--surface-color)' }}>
              <label style={{ fontSize: '14px', fontWeight: '800' }}>{promptConfig.title}</label>
              <input 
                type="text" 
                className="neo-input" 
                defaultValue={promptConfig.defaultValue} 
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    promptConfig.onSubmit(/** @type {HTMLInputElement} */ (e.target).value);
                    setPromptConfig(null);
                  }
                }}
                ref={input => input && setTimeout(() => input.focus(), 0)}
                id="custom-prompt-input"
              />
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button className="neo-btn" onClick={() => setPromptConfig(null)} style={{ background: 'var(--surface-color)' }}>Cancel</button>
                <button className="neo-btn" onClick={() => {
                  promptConfig.onSubmit(/** @type {HTMLInputElement} */ (document.getElementById('custom-prompt-input')).value);
                  setPromptConfig(null);
                }} style={{ background: 'var(--accent-yellow)' }}>Submit</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
