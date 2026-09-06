import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Download, Code, Loader2, Folder, File, ChevronLeft, Image as ImageIcon, FileText, FileCode, FileSpreadsheet, Presentation, Edit2, Save, PenTool, Eye, EyeOff, Trash2, MousePointer2, Eraser, Bold, Italic, Underline, Type, Play, ChevronDown, Maximize, Zap, Music } from 'lucide-react';
import * as mammoth from 'mammoth/mammoth.browser.js';
import * as XLSX from 'xlsx';
import DOMPurify from 'dompurify';
import { storage } from './firebase';
import { ref, uploadString, uploadBytes } from 'firebase/storage';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import SpreadsheetIDE from './components/SpreadsheetIDE';
import WordIDE from './components/WordIDE';
import PPTViewer from './components/PPTViewer';
import NotebookIDE from './components/NotebookIDE';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import PDFViewer from './components/PDFViewer';
import { ErrorBoundary } from './ErrorBoundary';
import { getApiUrl, getWsUrl } from './config';

export default function FileViewerModal({ fileData, folderFiles = [], onClose, onSaveCloudFile, onCreateCloudFile, onOpenFile, editor, boardName }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zipFiles, setZipFiles] = useState([]);
  const [pptxLoaded, setPptxLoaded] = useState(false);
  const [isPPTFullscreen, setIsPPTFullscreen] = useState(false);
  const [pptxViewerInstance, setPptxViewerInstance] = useState(null);
  
  // For zip files: state to hold the currently viewed inner file
  const [activeZipFile, setActiveZipFile] = useState(null);
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [isPresenting, setIsPresenting] = useState(false);
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);

  // Compiler State
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileOutput, setCompileOutput] = useState('');
  const [compileError, setCompileError] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);

  // Drawing State
  const [activeTool, setActiveTool] = useState('select'); // 'select', 'draw', 'erase', 'text'
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [strokes, setStrokes] = useState([]);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [drawColor, setDrawColor] = useState('#ef4444');
  const [drawFontSize, setDrawFontSize] = useState(24);
  const [drawFontFamily, setDrawFontFamily] = useState('Inter, sans-serif');
  const [pendingText, setPendingText] = useState(null);
  const [pendingTextBox, setPendingTextBox] = useState(null);
  const [selectedStrokeIndex, setSelectedStrokeIndex] = useState(-1);
  const [laserPoints, setLaserPoints] = useState([]);
  
  useEffect(() => {
    if (activeTool !== 'laser') {
      if (laserPoints.length > 0) setLaserPoints([]);
      return;
    }
    let frame;
    const update = () => {
       const now = Date.now();
       setLaserPoints(prev => {
         const next = prev.filter(p => now - p.t < 800);
         return next.length !== prev.length ? next : prev;
       });
       frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [activeTool, laserPoints.length]);
  
  // Download State
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Zoom & Search State
  const [zoomLevel, setZoomLevel] = useState(100);
  const [searchQuery, setSearchQuery] = useState('');
  
  // IDE State
  const [ideShowFiles, setIdeShowFiles] = useState(false);
  
  const childScrollRef = useRef({ left: 0, top: 0 });
  const svgRef = useRef(null);
  
  // Excel multi-sheet State
  const [excelSheets, setExcelSheets] = useState([]);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [spreadsheetDiffsState, setSpreadsheetDiffsState] = useState(null);

  const baseExt = (fileData.name || '').split('.').pop().toLowerCase();
  let urlExt = '';
  if (fileData.url && typeof fileData.url === 'string') {
    urlExt = fileData.url.split('?')[0].split('.').pop().toLowerCase();
  }
  const ext = urlExt === 'pdf' ? 'pdf' : baseExt;

  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
  const isCode = ['js', 'jsx', 'ts', 'tsx', 'py', 'html', 'css', 'json', 'cpp', 'c', 'java', 'go', 'rs', 'txt', 'md', 'csv'].includes(ext);
  const isRunnable = ['c', 'cpp', 'py', 'java', 'js'].includes(ext);
  const isWord = ['doc', 'docx'].includes(ext);
  const isExcel = ['xls', 'xlsx'].includes(ext);
  const isPowerPoint = ['ppt', 'pptx'].includes(ext);
  const isPdf = ext === 'pdf';
  const isZip = ['zip', 'rar', '7z'].includes(ext);
  const isNotebook = ext === 'ipynb';
  const isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext);


  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        setError(null);
        if (fileData.isCloudFile) {
          setContent(fileData.content || '');
          setEditContent(fileData.content || '');
          setLoading(false);
          return;
        }

        if (isCode || isNotebook) {
          if (fileData.url) {
            const response = await fetch(fileData.url);
            if (!response.ok) throw new Error('Failed to fetch file content');
            const text = await response.text();
            setContent(text);
            setEditContent(text);
          } else {
            setContent(fileData.content || '');
            setEditContent(fileData.content || '');
          }
        } else if (isZip && !activeZipFile) {
          const fileId = fileData.url.split('/').pop();
          const response = await fetch(`/api/zip-contents/${fileId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          const data = await response.json();
          if (data.success) {
             setZipFiles(data.files);
          } else {
             throw new Error(data.message || 'Failed to read ZIP');
          }
        } else if (isZip && activeZipFile) {
          const fileId = fileData.url.split('/').pop();
          const response = await fetch(`/api/zip-read/${fileId}?path=${encodeURIComponent(activeZipFile.path)}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (!response.ok) throw new Error('Failed to read file from ZIP');
          const text = await response.text();
          setContent(text);
          setEditContent(text);
        } else if (isWord) {
          const response = await fetch(fileData.url);
          if (!response.ok) throw new Error('Failed to fetch document');
          const arrayBuffer = await response.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setContent(result.value);
          setEditContent(result.value);
        } else if (isExcel) {
          const response = await fetch(fileData.url);
          if (!response.ok) throw new Error('Failed to fetch Excel document');
          const buffer = await response.arrayBuffer();
          try {
            const wb = XLSX.read(buffer, { type: 'array' });
            const getColLabel = (i) => {
              let label = '';
              let num = i;
              while (num >= 0) {
                label = String.fromCharCode(65 + (num % 26)) + label;
                num = Math.floor(num / 26) - 1;
              }
              return label;
            };

            const sheetsData = wb.SheetNames.map(name => {
              const data = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 });
              return { name, data };
            });

            // Apply synced diffs from Yjs
            if (fileData.originShapeId && editor) {
               const shape = editor.getShape(fileData.originShapeId);
               if (shape && shape.props.spreadsheetDiffs) {
                 const diffs = shape.props.spreadsheetDiffs;
                 sheetsData.forEach(sheet => {
                    if (diffs[sheet.name]) {
                       Object.keys(diffs[sheet.name]).forEach(r => {
                          Object.keys(diffs[sheet.name][r]).forEach(c => {
                             if (!sheet.data[r]) sheet.data[r] = [];
                             sheet.data[r][c] = diffs[sheet.name][r][c];
                          });
                       });
                    }
                 });
                 setSpreadsheetDiffsState(diffs);
               }
            }

            setExcelSheets(sheetsData);
            if (sheetsData.length > 0) {
              setContent('Spreadsheet Data Loaded');
            }
          } catch (e) {
            // Fallback: Some .xls files are actually just HTML tables exported from systems.
            const textResponse = await fetch(fileData.url);
            const text = await textResponse.text();
            // SECURITY FIX: Escape HTML to prevent XSS if the fallback is an arbitrary text file.
            setContent(text.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (!isCode && !isZip && !isWord && !isExcel) {
      setLoading(false);
    } else {
      fetchContent();
    }
  }, [fileData.url, fileData.fileId, fileData.originShapeId, fileData.name, activeZipFile, isCode, isZip, isWord, isExcel]);



  // Fetch annotations
  useEffect(() => {
    const getFileId = () => {
      if (activeZipFile) return activeZipFile.path.split('/').pop();
      if (fileData.fileId) return fileData.fileId;
      if (fileData.originShapeId) return fileData.originShapeId;
      if (fileData.url && !fileData.url.startsWith('data:') && !fileData.url.startsWith('blob:')) {
         return fileData.url.split('/').pop();
      }
      return fileData.name || 'unknown_file';
    };
    const fileId = getFileId();
    fetch(`/api/annotations/${encodeURIComponent(fileId)}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.strokes) setStrokes(data.strokes);
      }).catch(err => console.error("Failed to load annotations", err));
  }, [fileData.url, activeZipFile, fileData.fileId, fileData.originShapeId, fileData.name]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileData.url;
    link.download = fileData.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowDownloadMenu(false);
  };

  const handleDownloadPdf = async () => {
    if (isPdf) {
      handleDownload(); 
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const targetElement = document.getElementById('viewer-content-container');
      if (!targetElement) throw new Error("Content not found");
      const canvas = await html2canvas(targetElement, {
         scrollY: -window.scrollY,
         useCORS: true,
         scale: 2
      });
      const ctx = canvas.getContext('2d');
      const scale = 2;
      strokes.forEach(stroke => {
         if (stroke.type === 'text') {
            ctx.font = `${stroke.bold ? 'bold ' : ''}${stroke.italic ? 'italic ' : ''}${stroke.size * scale}px ${stroke.font}`;
            ctx.fillStyle = stroke.color;
            ctx.textBaseline = 'top';
            if (stroke.underline) {
               ctx.fillRect(stroke.x * scale, (stroke.y + stroke.size + 2) * scale, stroke.text.length * (stroke.size * 0.6) * scale, 2 * scale);
            }
            ctx.fillText(stroke.text, stroke.x * scale, stroke.y * scale);
         } else if (stroke.points && stroke.points.length > 0) {
            ctx.beginPath();
            ctx.moveTo(stroke.points[0][0] * scale, stroke.points[0][1] * scale);
            for (let i = 1; i < stroke.points.length; i++) {
               ctx.lineTo(stroke.points[i][0] * scale, stroke.points[i][1] * scale);
            }
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = 3 * scale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
         }
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pdfWidth;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      pdf.save(`${fileData.name}_annotated.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF");
    } finally {
      setIsGeneratingPdf(false);
      setShowDownloadMenu(false);
    }
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    
    if (fileData.isCloudFile && onSaveCloudFile) {
      onSaveCloudFile(editContent);
      setContent(editContent);
      setIsEditing(false);
      setSavingEdit(false);
      return;
    }

    try {
      const fileId = fileData.fileId || fileData.url.split('/').pop();
      if (activeZipFile) {
        alert("Editing inside ZIPs is not supported yet.");
        setSavingEdit(false);
        return;
      }

      const ext = (fileData.name || '').split('.').pop().toLowerCase();
      const isSpreadsheet = ['xlsx', 'xls', 'csv'].includes(ext);
      const isWordLocal = ['doc', 'docx'].includes(ext);
      
      // Fast-sync diffs for Spreadsheets on whiteboards (skips slow XLSX generation & upload)
      if (isSpreadsheet && fileData.originShapeId && editor) {
         editor.updateShape({
           id: fileData.originShapeId,
           type: 'milanote-file',
           props: { spreadsheetDiffs: spreadsheetDiffsState || {} }
         });
         setIsEditing(false);
         setSavingEdit(false);
         return;
      }

      // Fast-sync for Word docs on whiteboards (skips slow upload)
      if (isWordLocal && fileData.originShapeId && editor) {
         editor.updateShape({
           id: fileData.originShapeId,
           type: 'milanote-file',
           props: { content: editContent, isCloudFile: true }
         });
         setIsEditing(false);
         setSavingEdit(false);
         return;
      }

      let uploadData = editContent;
      let isBinary = false;
      let contentType = 'text/plain';

      if (['xlsx', 'xls', 'csv'].includes(ext) && excelSheets && excelSheets.length > 0) {
        const wb = XLSX.utils.book_new();
        excelSheets.forEach(sheet => {
           const ws = XLSX.utils.aoa_to_sheet(sheet.data);
           XLSX.utils.book_append_sheet(wb, ws, sheet.name);
        });
        const wbout = XLSX.write(wb, { bookType: ext === 'csv' ? 'csv' : 'xlsx', type: 'array' });
        uploadData = new Uint8Array(wbout);
        isBinary = true;
        contentType = ext === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      }

      const fileRef = ref(storage, fileData.url);
      if (isBinary) {
        await uploadBytes(fileRef, uploadData, { contentType });
      } else {
        await uploadString(fileRef, uploadData, 'raw', { contentType });
      }

      setContent(editContent);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      if (fileData.originShapeId && editor) {
        editor.updateShape({
          id: fileData.originShapeId,
          type: 'milanote-file',
          props: { content: editContent, isCloudFile: true }
        });
        setContent(editContent);
        setIsEditing(false);
      } else {
        alert("Failed to save. Error: " + err.message);
      }
    }
    setSavingEdit(false);
  };

  const getLanguageId = (extension) => {
    switch (extension) {
      case 'c': return 50;
      case 'cpp': return 54;
      case 'py': return 71;
      case 'java': return 62;
      case 'js': return 63;
      default: return null;
    }
  };

  const getAttachedFiles = async () => {
    if (!editor || !fileData.originShapeId) return [];
    
    const files = [];
    const addedFileIds = new Set([fileData.originShapeId]);
    const shapesToProcess = [fileData.originShapeId];
    
    while (shapesToProcess.length > 0) {
      const currentId = shapesToProcess.shift();
      const bindingsToCurrent = editor.getBindingsToShape(currentId, 'arrow');
      
      for (const binding of bindingsToCurrent) {
        const arrowId = binding.fromId;
        const arrowBindings = editor.getBindingsFromShape(arrowId, 'arrow');
        const otherBinding = arrowBindings.find(b => b.props.terminal !== binding.props.terminal);
        if (otherBinding && otherBinding.toId !== currentId) {
          const otherShape = editor.getShape(otherBinding.toId);
          if (otherShape && (otherShape.type === 'milanote-file' || otherShape.type === 'milanote-folder')) {
            if (!addedFileIds.has(otherShape.id)) {
              addedFileIds.add(otherShape.id);
              if (otherShape.type === 'milanote-file') {
                files.push({ name: otherShape.props.name, url: otherShape.props.url, content: otherShape.props.content });
              } else if (otherShape.type === 'milanote-folder' && otherShape.props.roomId) {
                // Fetch from nested room
                try {
                  const folderFiles = await new Promise((resolve) => {
                    const yDoc = new Y.Doc();
                    const hostUrl = `${getWsUrl()}/yjs`;
                    const token = localStorage.getItem('token');
                    const roomWithToken = token ? `${otherShape.props.roomId}?token=${token}` : otherShape.props.roomId;
                    const provider = new WebsocketProvider(hostUrl, roomWithToken, yDoc);
                    provider.on('sync', (isSynced) => {
                      if (isSynced) {
                        const yMap = yDoc.getMap(`tl_${otherShape.props.roomId}`);
                        const records = Array.from(yMap.values());
                        const extractedFiles = records.filter(r => r.type === 'milanote-file').map(r => ({
                          name: r.props.name,
                          url: r.props.url,
                          content: r.props.content
                        }));
                        provider.disconnect();
                        yDoc.destroy();
                        resolve(extractedFiles);
                      }
                    });
                    // Timeout fallback
                    setTimeout(() => resolve([]), 5000);
                  });
                  files.push(...folderFiles);
                } catch (e) {
                  console.error('Failed to fetch nested folder files', e);
                }
              }
              shapesToProcess.push(otherShape.id);
            }
          }
        }
      }
    }
    return files;
  };

  const handleRunCode = async () => {
    let runCommand = '';
    const filename = fileData.name || 'main';
    const nameWithoutExt = filename.split('.')[0] || 'main';
    
    try {
      await fetch(`${getApiUrl()}/api/terminal/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardName: boardName || 'Workspace',
          files: [{ name: filename, content: editContent || content || '' }]
        })
      });
    } catch (e) {
      console.error('Failed to sync before running', e);
    }

    if (ext === 'c') runCommand = `gcc "${filename}" -o "${nameWithoutExt}" && ".\\${nameWithoutExt}.exe"`;
    else if (ext === 'cpp') runCommand = `g++ "${filename}" -o "${nameWithoutExt}" && ".\\${nameWithoutExt}.exe"`;
    else if (ext === 'py') runCommand = `python "${filename}"`;
    else if (ext === 'js') runCommand = `node "${filename}"`;
    else if (ext === 'java') runCommand = `javac "${filename}" && java "${nameWithoutExt}"`;
    else if (ext === 'rs') runCommand = `rustc "${filename}" && ".\\${nameWithoutExt}.exe"`;
    else if (ext === 'go') runCommand = `go run "${filename}"`;
    
    if (runCommand) {
       window.dispatchEvent(new CustomEvent('terminal-run', { detail: runCommand }));
       window.dispatchEvent(new CustomEvent('terminal-focus'));
    } else {
       alert("Running this language directly is not supported yet.");
    }
  };

  const saveAnnotationsToBackend = (newStrokes) => {
    const getFileId = () => {
      if (activeZipFile) return activeZipFile.path.split('/').pop();
      if (fileData.fileId) return fileData.fileId;
      if (fileData.originShapeId) return fileData.originShapeId;
      if (fileData.url && !fileData.url.startsWith('data:') && !fileData.url.startsWith('blob:')) {
         return fileData.url.split('/').pop();
      }
      return fileData.name || 'unknown_file';
    };
    const fileId = getFileId();
    fetch(`/api/annotations/${encodeURIComponent(fileId)}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ strokes: newStrokes })
    }).catch(err => console.error("Failed to save annotations", err));
  };

  const handlePointerDown = (e) => {
    if (activeTool !== 'select') {
      // Prevent text selection in the underlying components while drawing/annotating
      e.preventDefault();
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + e.currentTarget.scrollLeft + childScrollRef.current.left;
    const y = e.clientY - rect.top + e.currentTarget.scrollTop + childScrollRef.current.top;
    
    if (activeTool === 'select') {
      let found = -1;
      // Reverse loop to pick the top-most stroke
      for (let i = strokes.length - 1; i >= 0; i--) {
        const stroke = strokes[i];
        if (stroke.type === 'text') {
          // Approximate hit box
          const textWidth = stroke.text.length * (stroke.size * 0.6);
          const textHeight = stroke.size * 1.2;
          // Note: stroke.y is the top-left for SVG text if dominant-baseline is hanging
          if (x >= stroke.x && x <= stroke.x + textWidth + 20 && y >= stroke.y && y <= stroke.y + textHeight) {
             found = i;
             break;
          }
        }
      }
      setSelectedStrokeIndex(found);
      return;
    }
    
    setSelectedStrokeIndex(-1); // clear selection if not using select tool

    if (activeTool === 'draw') {
      setCurrentStroke({ color: drawColor, points: [[x, y]] });
    } else if (activeTool === 'erase') {
      eraseStrokeAtPoint(x, y);
    } else if (activeTool === 'text') {
      if (pendingText) {
        if (pendingText.text.trim()) {
          const newStrokes = [...strokes, { type: 'text', x: pendingText.x, y: pendingText.y, text: pendingText.text, color: drawColor, size: drawFontSize, font: drawFontFamily }];
          setStrokes(newStrokes);
          saveAnnotationsToBackend(newStrokes);
        }
        setPendingText(null);
      } else {
        setPendingTextBox({ startX: x, startY: y, endX: x, endY: y });
      }
    }
  };

  const handlePointerMove = (e) => {
    if (activeTool === 'select') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
    const y = e.clientY - rect.top + e.currentTarget.scrollTop;
    
    if (activeTool === 'draw' && currentStroke) {
      setCurrentStroke(prev => ({ ...prev, points: [...prev.points, [x, y]] }));
    } else if (activeTool === 'erase' && e.buttons === 1) {
      eraseStrokeAtPoint(x, y);
    } else if (activeTool === 'text' && pendingTextBox) {
      setPendingTextBox(prev => ({ ...prev, endX: x, endY: y }));
    } else if (activeTool === 'laser' && e.buttons === 1) {
      setLaserPoints(prev => [...prev, { x, y, t: Date.now() }]);
    }
  };

  const handlePointerUp = () => {
    if (activeTool === 'draw' && currentStroke) {
      const newStrokes = [...strokes, currentStroke];
      setStrokes(newStrokes);
      setCurrentStroke(null);
      saveAnnotationsToBackend(newStrokes);
    } else if (activeTool === 'text' && pendingTextBox) {
      const { startX, startY, endX, endY } = pendingTextBox;
      const x = Math.min(startX, endX);
      const y = Math.min(startY, endY);
      setPendingTextBox(null);
      
      // If the box was extremely small (just a click), give it default dimensions
      if (Math.abs(startX - endX) < 5 && Math.abs(startY - endY) < 5) {
        setPendingText({ x, y, width: 200, text: '' });
      } else {
        setPendingText({ x, y, width: Math.abs(startX - endX), text: '' });
      }
    }
  };

  const eraseStrokeAtPoint = (x, y) => {
    const ERASER_RADIUS = 15;
    const distToSegmentSquared = (p, v, w) => {
      const l2 = (v[0] - w[0])**2 + (v[1] - w[1])**2;
      if (l2 === 0) return (p[0]-v[0])**2 + (p[1]-v[1])**2;
      let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
      t = Math.max(0, Math.min(1, t));
      return (p[0] - (v[0] + t * (w[0] - v[0])))**2 + (p[1] - (v[1] + t * (w[1] - v[1])))**2;
    };

    setStrokes(prevStrokes => {
      const newStrokes = prevStrokes.filter(stroke => {
        if (stroke.type === 'text') {
          // Approximate hit box for text
          const textWidth = stroke.text.length * 12; // Rough estimate
          const textHeight = stroke.size;
          if (x >= stroke.x - 10 && x <= stroke.x + textWidth && y >= stroke.y - 10 && y <= stroke.y + textHeight + 10) {
             return false;
          }
          return true;
        }
        if (stroke.points.length < 2) {
          const p = stroke.points[0];
          return ((x-p[0])**2 + (y-p[1])**2 > ERASER_RADIUS**2);
        }
        for (let i = 0; i < stroke.points.length - 1; i++) {
          if (distToSegmentSquared([x, y], stroke.points[i], stroke.points[i+1]) <= ERASER_RADIUS**2) {
            return false;
          }
        }
        return true;
      });
      if (newStrokes.length !== prevStrokes.length) {
         saveAnnotationsToBackend(newStrokes);
      }
      return newStrokes;
    });
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888' }}>
          <Loader2 size={32} className="spin" />
        </div>
      );
    }
    
    if (error) {
      return (
        <div style={{ color: '#ff6b6b', textAlign: 'center', marginTop: '40px' }}>
          Error loading preview: {error}
        </div>
      );
    }

    if (isImage) {
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
          <img src={fileData.url} alt={fileData.name} style={{ maxWidth: '100%', objectFit: 'contain' }} />
        </div>
      );
    }

    if (isAudio) {
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '40px', borderRadius: '50%', marginBottom: '20px' }}>
             <Play size={64} color="var(--accent)" />
          </div>
          <audio controls src={fileData.url} style={{ width: '80%', maxWidth: '600px', outline: 'none' }} />
        </div>
      );
    }

    if (isPowerPoint) {
      return (
        <div onClick={() => isPresenting && setShowFloatingToolbar(!showFloatingToolbar)} style={{ width: '100%', height: '100%' }}>
          <PPTViewer 
            fileData={fileData}
            isFullscreen={isPresenting}
            onToggleFullscreen={setIsPresenting}
            onClose={onClose}
            onSaveToCloudSuccess={(publicUrl) => {
              if (fileData.originShapeId && editor) {
                editor.updateShape({
                  id: fileData.originShapeId,
                  type: 'milanote-file',
                  props: { url: publicUrl, isCloudFile: true }
                });
              }
            }}
          />
        </div>
      );
    }

    if (isPdf) {
      return (
        <div onClick={() => isPresenting && setShowFloatingToolbar(!showFloatingToolbar)} style={{ width: '100%', minHeight: '100%', height: 'max-content' }}>
          <PDFViewer 
            fileData={fileData}
            isFullscreen={isPresenting}
            onToggleFullscreen={setIsPresenting}
            onClose={onClose}
            onSaveToCloudSuccess={(publicUrl) => {
              if (fileData.originShapeId && editor) {
                editor.updateShape({
                  id: fileData.originShapeId,
                  type: 'milanote-file',
                  props: { url: publicUrl, isCloudFile: true }
                });
              }
            }}
          />
        </div>
      );
    }

    if (isZip && !activeZipFile) {
      return (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h3 style={{ color: '#e0e0e0', marginTop: 0, marginBottom: '16px' }}>Folder Contents</h3>
          {zipFiles.map((f, i) => (
             <div 
               key={i} 
               onClick={() => {
                 if (!f.isDirectory) {
                   const fileExt = f.path.split('.').pop().toLowerCase();
                   if (['js', 'jsx', 'ts', 'tsx', 'py', 'html', 'css', 'json', 'cpp', 'c', 'java', 'go', 'rs', 'txt', 'md', 'csv'].includes(fileExt)) {
                     setActiveZipFile(f);
                   } else {
                     alert("Preview is only available for text/code files inside archives.");
                   }
                 }
               }}
               className={f.isDirectory ? '' : 'folder-file-btn'}
               style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'transparent', borderRadius: '6px', cursor: f.isDirectory ? 'default' : 'pointer', color: '#d4d4d4', transition: 'background 0.2s' }}
             >
               {f.isDirectory ? <Folder size={20} color="#f59e0b" /> : <FileCode size={20} color="#3b82f6" />}
               <span style={{ flex: 1, wordBreak: 'break-all' }}>{f.path}</span>
             </div>
          ))}
        </div>
      );
    }

    // Code/Text view or Notebook view (unified into NotebookIDE)
    if ((isCode || isNotebook) && !activeZipFile) {
      return (
        <div style={{ flex: 1, width: '100%', height: '100%', background: '#0a0a0c' }}>
          <NotebookIDE
            key={fileData.fileId || fileData.originShapeId || fileData.name}
            fileData={fileData}
            content={content}
            folderFiles={folderFiles.map(f => ({ id: f.id, name: f.name, content: f.content, url: f.url }))}
            onCodeChange={(newCode) => {
              setContent(newCode);
              setEditContent(newCode);
              if (onSaveCloudFile) {
                onSaveCloudFile(newCode);
              }
            }}
            boardName={boardName || 'Workspace'}
            isEditing={isEditing}
            onOpenFile={onOpenFile}
            showFiles={ideShowFiles}
            setShowFiles={setIdeShowFiles}
            originShapeId={fileData.originShapeId || fileData.fileId}
          />
        </div>
      );
    }

    if (isWord && !activeZipFile) {
      return (
        <WordIDE 
          fileData={fileData}
          content={content}
          setEditContent={setEditContent}
          isEditing={isEditing}
          onClose={onClose}
          onScrollUpdate={(scroll) => {
            childScrollRef.current = { left: scroll.left, top: scroll.top };
            if (svgRef.current) {
              svgRef.current.style.transform = `translate(${-scroll.left}px, ${-scroll.top}px)`;
            }
          }}
        />
      );
    }

    if (isExcel && !activeZipFile) {
      return (
        <SpreadsheetIDE 
          fileData={fileData}
          excelSheets={excelSheets}
          onScrollUpdate={(scroll) => {
            childScrollRef.current = { left: scroll.left, top: scroll.top };
            if (svgRef.current) {
              svgRef.current.style.transform = `translate(${-scroll.left}px, ${-scroll.top}px)`;
            }
          }}
          onChange={(update) => {
            if (update && update.isSpreadsheetDiff) {
               setSpreadsheetDiffsState(update.diffs);
            } else {
               setContent(update);
               setEditContent(update);
            }
          }}
          isEditing={isEditing}
          onClose={onClose}
        />
      );
    }

    if (isEditing) {
      return (
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          style={{ width: '100%', height: '100%', background: '#1e1e1e', color: '#d4d4d4', fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: '13px', padding: '20px', border: 'none', outline: 'none', resize: 'none' }}
        />
      );
    }

    return (
      <div 
        style={{ width: '100%', height: '100%', overflow: 'auto' }}
        onScroll={(e) => {
          childScrollRef.current = { left: e.target.scrollLeft, top: e.target.scrollTop };
          if (svgRef.current) {
            svgRef.current.style.transform = `translate(${-e.target.scrollLeft}px, ${-e.target.scrollTop}px)`;
          }
        }}
      >
        <pre style={{ margin: 0, padding: '20px', color: '#d4d4d4', fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-all', minHeight: '100%' }}>
          <code>{content || `DEBUG INFO: Name: ${fileData.name}, Ext: ${ext}, baseExt: ${baseExt}, urlExt: ${urlExt}, isWord: ${isWord}, isExcel: ${isExcel}, isCode: ${isCode}`}</code>
        </pre>
      </div>
    );
  };
  const title = activeZipFile ? activeZipFile.path.split('/').pop() : fileData.name;

  // No global keydown listener anymore since they use Eraser!

  const stopPropagation = (e) => {
    e.stopPropagation();
    if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
      e.nativeEvent.stopImmediatePropagation();
    }
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose} 
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none' }}
      onPointerDown={stopPropagation}
      onPointerMove={stopPropagation}
      onPointerUp={stopPropagation}
      onWheel={stopPropagation}
      onKeyDown={stopPropagation}
      onKeyUp={stopPropagation}
    >
      <div 
        className="modal-content utopian" 
        style={(isFullscreen || isPresenting) ? {
          width: '100vw', height: '100vh', background: 'rgba(9, 9, 11, 1)', display: 'flex', flexDirection: 'column', overflow: 'hidden'
        } : {
          width: '90%', maxWidth: '1200px', height: '85vh', background: 'rgba(9, 9, 11, 0.8)', backdropFilter: 'none', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', overflow: 'hidden'
        }}
        onClick={stopPropagation}
      >
        <style>{`
          .modal-content.utopian * {
            user-select: text !important;
            -webkit-user-select: text !important;
          }
          .floating-tools-widget {
            position: absolute;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            align-items: center;
            gap: 12px;
            background: rgba(9, 9, 11, 0.85);
            backdrop-filter: none;
            padding: 8px 16px;
            border-radius: 30px;
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            z-index: 100000;
          }
        `}</style>
        
        {/* Global Header */}
        {!isPresenting && (
        <div style={{ height: '60px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, zIndex: 50 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#e0e0e0', fontWeight: '500', fontSize: '15px' }}>
            {activeZipFile && (
              <button onClick={() => setActiveZipFile(null)} style={{ background: 'transparent', border: 'none', color: '#4ade80', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px 8px', borderRadius: '4px' }}>
                <ChevronLeft size={18} /> Back
              </button>
            )}
            {!activeZipFile && isImage && <ImageIcon size={20} color="#a855f7" />}
            {!activeZipFile && isAudio && <Music size={20} color="#ec4899" />}
            {!activeZipFile && isCode && <Code size={20} color="#4ade80" />}
            {!activeZipFile && isWord && <FileText size={20} color="#3b82f6" />}
            {!activeZipFile && isExcel && <FileSpreadsheet size={20} color="#217346" />}
            {!activeZipFile && isPowerPoint && <Presentation size={20} color="#6b7280" />}
            {!activeZipFile && isZip && <Folder size={20} color="#f59e0b" />}
            {activeZipFile && <File size={20} color="#3b82f6" />}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
               {title}
            </span>
          </div>
          
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            
            {/* Draw Tools */}
            {!isEditing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '8px' }}>
              <button 
                onClick={() => setActiveTool('select')}
                style={{ background: activeTool === 'select' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'var(--surface-color)', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex' }}
                title="Select Mode"
              ><MousePointer2 size={16} /></button>

              <button 
                onClick={() => setActiveTool('draw')}
                style={{ background: activeTool === 'draw' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'var(--surface-color)', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex' }}
                title="Draw Mode"
              ><PenTool size={16} /></button>
              
              <button 
                onClick={() => setActiveTool('laser')}
                style={{ background: activeTool === 'laser' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'var(--surface-color)', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex' }}
                title="Laser Pointer Mode"
              ><Zap size={16} /></button>
              
              <button 
                onClick={() => setActiveTool('text')}
                style={{ background: activeTool === 'text' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'var(--surface-color)', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex' }}
                title="Text Annotation Mode"
              ><Type size={16} /></button>

              <button 
                onClick={() => setActiveTool('erase')}
                style={{ background: activeTool === 'erase' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'var(--surface-color)', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex' }}
                title="Eraser Mode"
              ><Eraser size={16} /></button>
              
              {(activeTool === 'draw' || activeTool === 'text') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '4px', paddingLeft: '8px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                  <input type="color" value={drawColor} onChange={e => setDrawColor(e.target.value)} style={{ width: '24px', height: '24px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
                  {activeTool === 'text' && (
                    <>
                      <select 
                        value={drawFontFamily}
                        onChange={(e) => setDrawFontFamily(e.target.value)}
                        style={{ padding: '4px', borderRadius: '4px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '12px', outline: 'none' }}
                      >
                        <option value="Inter, sans-serif" style={{color: 'black'}}>Inter</option>
                        <option value="Outfit, sans-serif" style={{color: 'black'}}>Outfit</option>
                        <option value="Fira Code, monospace" style={{color: 'black'}}>Fira Code</option>
                        <option value="Playfair Display, serif" style={{color: 'black'}}>Playfair</option>
                        <option value="Caveat, cursive" style={{color: 'black'}}>Caveat</option>
                        <option value="Cinzel, serif" style={{color: 'black'}}>Cinzel</option>
                        <option value="Creepster, cursive" style={{color: 'black'}}>Creepster</option>
                        <option value="Bungee, cursive" style={{color: 'black'}}>Bungee</option>
                        <option value="Press Start 2P, cursive" style={{color: 'black'}}>Arcade</option>
                        <option value="Pacifico, cursive" style={{color: 'black'}}>Pacifico</option>
                      </select>
                      <select 
                        value={drawFontSize}
                        onChange={(e) => setDrawFontSize(Number(e.target.value))}
                        style={{ padding: '4px', borderRadius: '4px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '12px', outline: 'none' }}
                      >
                        <option value="11" style={{color: 'black'}}>11</option>
                        <option value="12" style={{color: 'black'}}>12</option>
                        <option value="14" style={{color: 'black'}}>14</option>
                        <option value="16" style={{color: 'black'}}>16</option>
                        <option value="18" style={{color: 'black'}}>18</option>
                        <option value="20" style={{color: 'black'}}>20</option>
                        <option value="24" style={{color: 'black'}}>24</option>
                        <option value="28" style={{color: 'black'}}>28</option>
                        <option value="36" style={{color: 'black'}}>36</option>
                        <option value="48" style={{color: 'black'}}>48</option>
                        <option value="72" style={{color: 'black'}}>72</option>
                      </select>
                    </>
                  )}
                </div>
              )}
              
              <button 
                onClick={() => setShowAnnotations(!showAnnotations)}
                style={{ background: 'transparent', border: 'none', color: showAnnotations ? '#39ff14' : '#888', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', marginLeft: '4px' }}
                title="Toggle Annotations"
              >{showAnnotations ? <Eye size={16} /> : <EyeOff size={16} />}</button>
            </div>
            )}

            {/* Edit Tools */}
            {(isCode || isWord || isExcel) && !activeZipFile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '8px' }}>
                {isRunnable && (
                  <button onClick={handleRunCode} disabled={isCompiling} style={{ background: isCompiling ? 'var(--accent-hover)' : 'var(--accent)', border: 'none', color: 'var(--surface-color)', cursor: isCompiling ? 'not-allowed' : 'pointer', padding: '6px 12px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                    {isCompiling ? <Loader2 size={16} className="spin" /> : <Play size={16} />} Run
                  </button>
                )}
                {isEditing ? (
                  <button onClick={handleSaveEdit} disabled={savingEdit} style={{ background: 'var(--accent-hover)', border: 'none', color: 'var(--surface-color)', cursor: 'pointer', padding: '6px 12px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                    {savingEdit ? <Loader2 size={16} className="spin" /> : <Save size={16} />} Save
                  </button>
                ) : (
                  <button onClick={() => { setEditContent(content); setIsEditing(true); setActiveTool('select'); }} style={{ background: 'var(--accent)', border: 'none', color: 'var(--surface-color)', cursor: 'pointer', padding: '6px 12px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                    <Edit2 size={16} /> Edit {isWord ? 'Text' : (isExcel ? 'Sheet' : (isCode ? 'Code' : 'File'))}
                  </button>
                )}
              </div>
            )}

            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowDownloadMenu(!showDownloadMenu)} style={{ background: '#4b5563', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                {isGeneratingPdf ? <Loader2 size={16} className="spin" /> : <Download size={16} />} DL <ChevronDown size={14} />
              </button>
              {showDownloadMenu && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: 'var(--color-bg)', border: '1px solid var(--color-text)', borderRadius: '6px', overflow: 'hidden', zIndex: 100, display: 'flex', flexDirection: 'column', width: '150px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                  <button onClick={handleDownload} style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 12px', textAlign: 'left', cursor: 'pointer', fontSize: '13px' }} onMouseEnter={e => e.target.style.background='rgba(255,255,255,0.1)'} onMouseLeave={e => e.target.style.background='transparent'}>Original File</button>
                  <button onClick={handleDownloadPdf} style={{ background: 'transparent', border: 'none', color: 'white', padding: '8px 12px', textAlign: 'left', cursor: 'pointer', fontSize: '13px' }} onMouseEnter={e => e.target.style.background='rgba(255,255,255,0.1)'} onMouseLeave={e => e.target.style.background='transparent'}>Annotated PDF</button>
                </div>
              )}
            </div>
            
            {(isPowerPoint || isPdf) && (
              <button 
                onClick={() => { setIsPresenting(true); setShowFloatingToolbar(false); }} 
                style={{ background: '#3b82f6', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
              >
                <Presentation size={16} /> Present
              </button>
            )}

            <button onClick={() => setIsFullscreen(!isFullscreen)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--surface-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', transition: 'all 0.15s' }}>
              {isFullscreen ? <X size={16} /> : <Maximize size={14} />}
            </button>
            
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--surface-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', transition: 'all 0.15s' }}>
              <X size={18} />
            </button>
          </div>
        </div>
        )}

        {/* Presenting Header (Escape button only) */}
        {isPresenting && (
          <button 
            onClick={() => setIsPresenting(false)} 
            style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', zIndex: 100001, transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.8)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
          >
            <X size={24} />
          </button>
        )}

        {/* Floating Presentation Toolbar */}
        {isPresenting && showFloatingToolbar && (
          <div className="floating-tools-widget">
            <button 
              onClick={() => setActiveTool('select')}
              style={{ background: activeTool === 'select' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex' }}
              title="Select Mode"
            ><MousePointer2 size={20} /></button>

            <button 
              onClick={() => setActiveTool('draw')}
              style={{ background: activeTool === 'draw' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex' }}
              title="Draw Mode"
            ><PenTool size={20} /></button>
            
            <button 
              onClick={() => setActiveTool('laser')}
              style={{ background: activeTool === 'laser' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex' }}
              title="Laser Pointer Mode"
            ><Zap size={20} /></button>
            
            <button 
              onClick={() => setActiveTool('text')}
              style={{ background: activeTool === 'text' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex' }}
              title="Text Annotation Mode"
            ><Type size={20} /></button>

            <button 
              onClick={() => setActiveTool('erase')}
              style={{ background: activeTool === 'erase' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex' }}
              title="Eraser Mode"
            ><Eraser size={20} /></button>
            
            {(activeTool === 'draw' || activeTool === 'text') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '4px', paddingLeft: '8px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                <input type="color" value={drawColor} onChange={e => setDrawColor(e.target.value)} style={{ width: '28px', height: '28px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
                {activeTool === 'text' && (
                  <>
                    <select 
                      value={drawFontFamily}
                      onChange={(e) => setDrawFontFamily(e.target.value)}
                      style={{ padding: '6px', borderRadius: '4px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '13px', outline: 'none' }}
                    >
                      <option value="Inter, sans-serif" style={{color: 'black'}}>Inter</option>
                      <option value="Outfit, sans-serif" style={{color: 'black'}}>Outfit</option>
                      <option value="Fira Code, monospace" style={{color: 'black'}}>Fira Code</option>
                      <option value="Playfair Display, serif" style={{color: 'black'}}>Playfair</option>
                      <option value="Caveat, cursive" style={{color: 'black'}}>Caveat</option>
                      <option value="Cinzel, serif" style={{color: 'black'}}>Cinzel</option>
                      <option value="Creepster, cursive" style={{color: 'black'}}>Creepster</option>
                      <option value="Bungee, cursive" style={{color: 'black'}}>Bungee</option>
                      <option value="Press Start 2P, cursive" style={{color: 'black'}}>Arcade</option>
                      <option value="Pacifico, cursive" style={{color: 'black'}}>Pacifico</option>
                    </select>
                    <select 
                      value={drawFontSize}
                      onChange={(e) => setDrawFontSize(Number(e.target.value))}
                      style={{ padding: '6px', borderRadius: '4px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '13px', outline: 'none' }}
                    >
                      <option value="11" style={{color: 'black'}}>11</option>
                      <option value="12" style={{color: 'black'}}>12</option>
                      <option value="14" style={{color: 'black'}}>14</option>
                      <option value="16" style={{color: 'black'}}>16</option>
                      <option value="18" style={{color: 'black'}}>18</option>
                      <option value="20" style={{color: 'black'}}>20</option>
                      <option value="24" style={{color: 'black'}}>24</option>
                      <option value="28" style={{color: 'black'}}>28</option>
                      <option value="36" style={{color: 'black'}}>36</option>
                      <option value="48" style={{color: 'black'}}>48</option>
                      <option value="72" style={{color: 'black'}}>72</option>
                    </select>
                  </>
                )}
              </div>
            )}
            
            <button 
              onClick={() => setShowAnnotations(!showAnnotations)}
              style={{ background: 'transparent', border: 'none', color: showAnnotations ? '#39ff14' : '#888', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', marginLeft: '4px' }}
              title="Toggle Annotations"
            >{showAnnotations ? <Eye size={20} /> : <EyeOff size={20} />}</button>
          </div>
        )}

        {/* Main Content Area */}
        <div 
          id="viewer-content-container"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', cursor: (!isEditing && activeTool !== 'select') ? 'crosshair' : 'auto', minHeight: 0 }}
          onPointerDown={!isEditing ? handlePointerDown : undefined}
          onPointerMove={!isEditing ? handlePointerMove : undefined}
          onPointerUp={!isEditing ? handlePointerUp : undefined}
          onPointerLeave={!isEditing ? handlePointerUp : undefined}
        >
           <ErrorBoundary>{renderContent()}</ErrorBoundary>
           {showAnnotations && !isEditing && (
             <svg ref={svgRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', zIndex: 10 }}>
               {strokes.map((stroke, i) => {
                 if (stroke.type === 'text') {
                   const isSelected = i === selectedStrokeIndex;
                   return (
                     <g key={i}>
                       {isSelected && (
                         <rect
                           x={stroke.x - 4}
                           y={stroke.y - 4}
                           width={(stroke.text.length * (stroke.size * 0.6)) + 8}
                           height={stroke.size * 1.2 + 8}
                           fill="none"
                           stroke="var(--accent)"
                           strokeWidth="2"
                           strokeDasharray="4,4"
                         />
                       )}
                       <text 
                         x={stroke.x} 
                         y={stroke.y} 
                         fill={stroke.color} 
                         fontSize={stroke.size} 
                         fontFamily={stroke.font}
                         fontWeight={stroke.bold ? 'bold' : 'normal'}
                         fontStyle={stroke.italic ? 'italic' : 'normal'}
                         textDecoration={stroke.underline ? 'underline' : 'none'}
                         dominantBaseline="hanging"
                         style={{ whiteSpace: 'pre' }}
                       >
                         {stroke.text}
                       </text>
                     </g>
                   );
                 }
                 
                 // Render normal drawing paths
                 return (
                   <path 
                     key={i} 
                     d={`M ${stroke.points.map(p => `${p[0]} ${p[1]}`).join(' L ')}`} 
                     stroke={stroke.color} 
                     strokeWidth="3" 
                     fill="none" 
                     strokeLinecap="round" 
                     strokeLinejoin="round" 
                   />
                 );
               })}
               {currentStroke && (
                 <path 
                   d={`M ${currentStroke.points.map(p => `${p[0]} ${p[1]}`).join(' L ')}`} 
                   stroke={currentStroke.color} 
                   strokeWidth={currentStroke.size || 3} 
                   fill="none" 
                   strokeLinecap="round" 
                   strokeLinejoin="round" 
                 />
               )}
               {pendingTextBox && (
                 <rect
                   x={Math.min(pendingTextBox.startX, pendingTextBox.endX)}
                   y={Math.min(pendingTextBox.startY, pendingTextBox.endY)}
                   width={Math.abs(pendingTextBox.startX - pendingTextBox.endX)}
                   height={Math.abs(pendingTextBox.startY - pendingTextBox.endY)}
                   fill="transparent"
                   stroke="var(--accent)"
                   strokeWidth="2"
                   strokeDasharray="5,5"
                 />
               )}
               {/* Laser Trail */}
               {laserPoints.length > 1 && (
                 <path 
                   d={`M ${laserPoints.map(p => `${p.x} ${p.y}`).join(' L ')}`} 
                   stroke="#ef4444" 
                   strokeWidth={4} 
                   fill="none" 
                   strokeLinecap="round" 
                   strokeLinejoin="round" 
                   style={{ filter: 'drop-shadow(0 0 8px #ef4444)', pointerEvents: 'none' }}
                 />
               )}
               {laserPoints.length > 0 && (
                 <circle 
                   cx={laserPoints[laserPoints.length - 1].x} 
                   cy={laserPoints[laserPoints.length - 1].y} 
                   r={4} 
                   fill="#ef4444" 
                   style={{ filter: 'drop-shadow(0 0 12px #ef4444)', pointerEvents: 'none' }}
                 />
               )}
             </svg>
           )}

           {pendingText && (
             <textarea
               autoFocus
               value={pendingText.text}
               onChange={(e) => setPendingText({ ...pendingText, text: e.target.value })}
               onKeyDown={(e) => {
                 if (e.key === 'Enter' && !e.shiftKey) {
                   e.preventDefault();
                   const newStrokes = [...strokes, { type: 'text', x: pendingText.x, y: pendingText.y, text: pendingText.text, color: drawColor, size: drawFontSize, font: drawFontFamily }];
                   setStrokes(newStrokes);
                   setPendingText(null);
                   saveAnnotationsToBackend(newStrokes);
                 }
               }}
               onBlur={() => {
                 if (pendingText.text.trim()) {
                   const newStrokes = [...strokes, { type: 'text', x: pendingText.x, y: pendingText.y, text: pendingText.text, color: drawColor, size: drawFontSize, font: drawFontFamily }];
                   setStrokes(newStrokes);
                   saveAnnotationsToBackend(newStrokes);
                 }
                 setPendingText(null);
               }}
               style={{
                 position: 'absolute',
                 left: pendingText.x,
                 top: pendingText.y,
                 width: pendingText.width + 'px',
                 minHeight: (drawFontSize * 1.5) + 'px',
                 color: drawColor,
                 fontSize: drawFontSize + 'px',
                 fontFamily: drawFontFamily,
                 fontWeight: 'bold',
                 background: 'transparent',
                 border: '1px dashed #ccc',
                 outline: 'none',
                 padding: 0,
                 zIndex: 20,
                 resize: 'none',
                 overflow: 'hidden'
               }}
             />
           )}
        </div>

        {/* Presenting Floating Toolbar */}
        {isPresenting && showFloatingToolbar && (
          <div className="floating-tools-widget" style={{ pointerEvents: 'auto' }}>
            <button 
              onClick={() => setActiveTool('select')}
              style={{ background: activeTool === 'select' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex' }}
            ><MousePointer2 size={18} /></button>
            <button 
              onClick={() => setActiveTool('draw')}
              style={{ background: activeTool === 'draw' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex' }}
            ><PenTool size={18} /></button>
            <button 
              onClick={() => setActiveTool('laser')}
              style={{ background: activeTool === 'laser' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex' }}
            ><Zap size={18} /></button>
            <button 
              onClick={() => setActiveTool('erase')}
              style={{ background: activeTool === 'erase' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex' }}
            ><Eraser size={18} /></button>
            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)' }} />
            <input type="color" value={drawColor} onChange={e => setDrawColor(e.target.value)} style={{ width: '24px', height: '24px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
          </div>
        )}
        
        {/* Embedded Terminal Removed */}

        {/* Fullscreen Minimize Button */}
        {isFullscreen && (
          <button 
            onClick={() => setIsFullscreen(false)} 
            style={{ 
              position: 'absolute', bottom: '24px', right: '24px', 
              background: 'rgba(0, 255, 204, 0.1)', border: '1px solid rgba(0, 255, 204, 0.3)', 
              color: '#00ffcc', padding: '12px 24px', borderRadius: '30px', 
              cursor: 'pointer', zIndex: 100001, display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.8), 0 0 20px rgba(0,255,204,0.1)',
              fontWeight: 600, fontSize: '14px', backdropFilter: 'none',
              transition: 'all 0.2s'
            }}
          >
            Minimize Screen
          </button>
        )}
      </div>
    </div>
  );
}
