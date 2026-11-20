import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  FileSpreadsheet, Undo, Redo, Bold, Italic, Underline, ChevronDown
} from 'lucide-react';
import '../index.css';

const ROW_HEIGHT = 28;
const COL_WIDTH = 100;
const HEADER_WIDTH = 50;
const HEADER_HEIGHT = 28;
const DEFAULT_ROWS = 1000;
const DEFAULT_COLS = 1000;

const getColLabel = (i) => {
  let label = '';
  let num = i;
  while (num >= 0) {
    label = String.fromCharCode(65 + (num % 26)) + label;
    num = Math.floor(num / 26) - 1;
  }
  return label;
};

export default function SpreadsheetIDE({
  fileData,
  excelSheets,
  onClose,
  onChange,
  isEditing = true,
  onScrollUpdate
}) {
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [zoom, setZoom] = useState(100);

  const [scroll, setScroll] = useState({ top: 0, left: 0 });
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const containerRef = useRef(null);

  const [colWidths, setColWidths] = useState({});
  const [rowHeights, setRowHeights] = useState({});
  const [resizing, setResizing] = useState(null);

  const [selectedCols, setSelectedCols] = useState(new Set());
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [colStyles, setColStyles] = useState({});
  const [rowStyles, setRowStyles] = useState({});
  const [cellStyles, setCellStyles] = useState({});
  const [, setForceUpdate] = useState(0);
  
  const [diffs, setDiffs] = useState({});

  // Fallback to empty 2D array if no data
  const sheets = useMemo(() => {
    if (excelSheets && excelSheets.length > 0) {
      return excelSheets.map(s => ({
        name: s.name,
        data: Array.isArray(s.data) ? s.data : []
      }));
    }
    return [{ name: 'Data Matrix 1', data: [] }];
  }, [excelSheets]);

  const currentSheet = sheets[activeSheetIdx] || sheets[0];
  const data = currentSheet.data || [];

  const maxDataCols = data.reduce((max, row) => Math.max(max, row ? row.length : 0), 0);
  const totalRows = Math.max(DEFAULT_ROWS, data.length);
  const totalCols = Math.max(DEFAULT_COLS, maxDataCols);

  // Helper to compute absolute positions for resized grids in O(K) time
  // K is the number of explicitly resized columns/rows
  const getColLeft = (colIdx) => {
    let diff = 0;
    for (const key in colWidths) {
      if (Number(key) < colIdx) {
        diff += (colWidths[key] - COL_WIDTH);
      }
    }
    return colIdx * COL_WIDTH + diff;
  };

  const getRowTop = (rowIdx) => {
    let diff = 0;
    for (const key in rowHeights) {
      if (Number(key) < rowIdx) {
        diff += (rowHeights[key] - ROW_HEIGHT);
      }
    }
    return rowIdx * ROW_HEIGHT + diff;
  };

  // Compute total dimensions in O(K) to prevent freezing on 1,000,000 rows
  const customColsDiff = Object.values(colWidths).reduce((acc, val) => acc + (val - COL_WIDTH), 0);
  const customRowsDiff = Object.values(rowHeights).reduce((acc, val) => acc + (val - ROW_HEIGHT), 0);
  const totalWidth = (totalCols * COL_WIDTH) + HEADER_WIDTH + customColsDiff;
  const totalHeight = (totalRows * ROW_HEIGHT) + HEADER_HEIGHT + customRowsDiff;

  // Handle Resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Handle Scroll
  const handleScroll = (e) => {
    const newScroll = {
      top: e.target.scrollTop,
      left: e.target.scrollLeft,
      width: e.target.clientWidth,
      height: e.target.clientHeight
    };
    setScroll(newScroll);
    if (onScrollUpdate) onScrollUpdate(newScroll);
  };

  const overscan = 5;
  const viewHeight = containerSize.height / (zoom / 100);
  const viewWidth = containerSize.width / (zoom / 100);

  let startRow = Math.max(0, Math.floor(scroll.top / ROW_HEIGHT));
  let startY = getRowTop(startRow);
  while (startY > scroll.top && startRow > 0) {
    startRow--;
    startY = getRowTop(startRow);
  }
  while (startY + (rowHeights[startRow] || ROW_HEIGHT) < scroll.top && startRow < totalRows - 1) {
    startY += rowHeights[startRow] || ROW_HEIGHT;
    startRow++;
  }
  startRow = Math.max(0, startRow - overscan);
  startY = getRowTop(startRow);

  let endRow = startRow;
  let endY = startY;
  while (endY < scroll.top + viewHeight && endRow < totalRows - 1) {
    endY += rowHeights[endRow] || ROW_HEIGHT;
    endRow++;
  }
  endRow = Math.min(totalRows - 1, endRow + overscan);

  let startCol = Math.max(0, Math.floor(scroll.left / COL_WIDTH));
  let startX = getColLeft(startCol);
  while (startX > scroll.left && startCol > 0) {
    startCol--;
    startX = getColLeft(startCol);
  }
  while (startX + (colWidths[startCol] || COL_WIDTH) < scroll.left && startCol < totalCols - 1) {
    startX += colWidths[startCol] || COL_WIDTH;
    startCol++;
  }
  startCol = Math.max(0, startCol - overscan);
  startX = getColLeft(startCol);

  let endCol = startCol;
  let endX = startX;
  while (endX < scroll.left + viewWidth && endCol < totalCols - 1) {
    endX += colWidths[endCol] || COL_WIDTH;
    endCol++;
  }
  endCol = Math.min(totalCols - 1, endCol + overscan);

  const handlePointerMove = useCallback((e) => {
    if (!resizing) return;
    if (resizing.type === 'col') {
      const diff = (e.clientX - resizing.startPos) / (zoom / 100);
      const newWidth = Math.max(40, resizing.startSize + diff);
      setColWidths(prev => ({ ...prev, [resizing.index]: newWidth }));
    } else {
      const diff = (e.clientY - resizing.startPos) / (zoom / 100);
      const newHeight = Math.max(20, resizing.startSize + diff);
      setRowHeights(prev => ({ ...prev, [resizing.index]: newHeight }));
    }
  }, [resizing, zoom]);

  const handlePointerUp = useCallback((e) => {
    if (resizing && resizing.target && resizing.pointerId !== undefined) {
      try { resizing.target.releasePointerCapture(resizing.pointerId); } catch(err) {}
    }
    setResizing(null);
  }, [resizing]);

  const onColResizeStart = (e, c, currentWidth) => {
    if (!isEditing) return;
    e.stopPropagation();
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);
    setResizing({ type: 'col', index: c, startPos: e.clientX, startSize: currentWidth, pointerId: e.pointerId, target: e.target });
  };

  const onRowResizeStart = (e, r, currentHeight) => {
    if (!isEditing) return;
    e.stopPropagation();
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);
    setResizing({ type: 'row', index: r, startPos: e.clientY, startSize: currentHeight, pointerId: e.pointerId, target: e.target });
  };

  const execCmd = (cmd, val = null) => {
    if (!isEditing) return;
    document.execCommand(cmd, false, val);
  };

  const toggleFormat = (format) => {
    if (!isEditing) return;
    
    // Determine if we should apply bulk format
    if (selectedCols.size > 0 || selectedRows.size > 0 || selectedCells.size > 0) {
      if (selectedCols.size > 0) {
        setColStyles(prev => {
          const next = { ...prev };
          selectedCols.forEach(c => {
            const current = next[c] || {};
            next[c] = { ...current, [format]: !current[format] };
          });
          return next;
        });
      }
      if (selectedRows.size > 0) {
        setRowStyles(prev => {
          const next = { ...prev };
          selectedRows.forEach(r => {
            const current = next[r] || {};
            next[r] = { ...current, [format]: !current[format] };
          });
          return next;
        });
      }
      if (selectedCells.size > 0) {
        setCellStyles(prev => {
          const next = { ...prev };
          selectedCells.forEach(key => {
            const current = next[key] || {};
            next[key] = { ...current, [format]: !current[format] };
          });
          return next;
        });
      }
      setForceUpdate(u => u + 1);
    } else {
      execCmd(format);
    }
  };

  const renderCells = () => {
    const cells = [];
    cells.push(
      <div key="corner" style={{
        position: 'absolute', top: scroll.top, left: scroll.left, width: HEADER_WIDTH, height: HEADER_HEIGHT,
        background: '#050505', borderRight: '1px solid rgba(0,255,204,0.3)', borderBottom: '1px solid rgba(0,255,204,0.3)',
        zIndex: 40
      }} />
    );

    let currX = startX;
    for (let c = startCol; c <= endCol; c++) {
      const w = colWidths[c] || COL_WIDTH;
      const isSelected = selectedCols.has(c);
      cells.push(
        <div key={`col-${c}`} 
          onClick={() => {
            if (!isEditing) return;
            const next = new Set(selectedCols);
            if (next.has(c)) next.delete(c); else next.add(c);
            setSelectedCols(next);
            setSelectedRows(new Set());
            setSelectedCells(new Set());
          }}
          style={{
            position: 'absolute', top: scroll.top, left: HEADER_WIDTH + currX, width: w, height: HEADER_HEIGHT,
            background: isSelected ? 'rgba(0, 255, 204, 0.2)' : '#111', 
            color: isSelected ? 'var(--surface-color)' : '#00ffcc', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRight: '1px solid rgba(0,255,204,0.15)', borderBottom: '1px solid rgba(0,255,204,0.3)', zIndex: 30,
            boxShadow: 'inset 0 0 0 1px rgba(0, 255, 204, 0.1)', fontSize: 12, userSelect: 'none', cursor: isEditing ? 'pointer' : 'default'
        }}>
          {getColLabel(c)}
          {isEditing && (
            <div 
              onPointerDown={(e) => onColResizeStart(e, c, w)}
              onClick={e => e.stopPropagation()}
              style={{ position: 'absolute', right: -4, top: 0, bottom: 0, width: 8, cursor: 'col-resize', zIndex: 35 }}
            />
          )}
        </div>
      );
      currX += w;
    }

    let currY = startY;
    for (let r = startRow; r <= endRow; r++) {
      const h = rowHeights[r] || ROW_HEIGHT;
      const isSelected = selectedRows.has(r);
      cells.push(
        <div key={`row-${r}`} 
          onClick={() => {
            if (!isEditing) return;
            const next = new Set(selectedRows);
            if (next.has(r)) next.delete(r); else next.add(r);
            setSelectedRows(next);
            setSelectedCols(new Set());
            setSelectedCells(new Set());
          }}
          style={{
            position: 'absolute', top: HEADER_HEIGHT + currY, left: scroll.left, width: HEADER_WIDTH, height: h,
            background: isSelected ? 'rgba(0, 255, 204, 0.2)' : '#111', 
            color: isSelected ? 'var(--surface-color)' : '#00ffcc', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRight: '1px solid rgba(0,255,204,0.3)', borderBottom: '1px solid rgba(0,255,204,0.15)', zIndex: 30,
            boxShadow: 'inset 0 0 0 1px rgba(0, 255, 204, 0.1)', fontSize: 12, userSelect: 'none', cursor: isEditing ? 'pointer' : 'default'
        }}>
          {r + 1}
          {isEditing && (
            <div 
              onPointerDown={(e) => onRowResizeStart(e, r, h)}
              onClick={e => e.stopPropagation()}
              style={{ position: 'absolute', bottom: -4, left: 0, right: 0, height: 8, cursor: 'row-resize', zIndex: 35 }}
            />
          )}
        </div>
      );

      let cellX = startX;
      const rowData = data[r] || [];
      for (let c = startCol; c <= endCol; c++) {
        const cw = colWidths[c] || COL_WIDTH;
        const val = rowData[c] !== undefined ? rowData[c] : '';
        
        const isSelected = selectedCols.has(c) || selectedRows.has(r) || selectedCells.has(`${r}-${c}`);
        const cStyle = colStyles[c] || {};
        const rStyle = rowStyles[r] || {};
        const indStyle = cellStyles[`${r}-${c}`] || {};
        
        const isBold = indStyle.bold || cStyle.bold || rStyle.bold;
        const isItalic = indStyle.italic || cStyle.italic || rStyle.italic;
        const isUnderline = indStyle.underline || cStyle.underline || rStyle.underline;

        cells.push(
          <div key={`cell-${r}-${c}`} 
            className="virtual-cell"
            contentEditable={isEditing}
            suppressContentEditableWarning
            onClick={() => {
              if (!isEditing) return;
              if (selectedCols.size > 0 || selectedRows.size > 0) {
                 setSelectedCols(new Set());
                 setSelectedRows(new Set());
                 setSelectedCells(new Set([`${r}-${c}`]));
              } else {
                 const next = new Set(selectedCells);
                 next.add(`${r}-${c}`);
                 setSelectedCells(next);
              }
            }}
            onBlur={(e) => {
              if (isEditing) {
                if (!data[r]) data[r] = [];
                const newVal = e.target.innerText;
                if (data[r][c] !== newVal) {
                  data[r][c] = newVal;
                  setDiffs(prev => {
                    const next = { ...prev };
                    if (!next[currentSheet.name]) next[currentSheet.name] = {};
                    if (!next[currentSheet.name][r]) next[currentSheet.name][r] = {};
                    next[currentSheet.name][r][c] = newVal;
                    if (onChange) onChange({ isSpreadsheetDiff: true, diffs: next });
                    return next;
                  });
                  setForceUpdate(u => u + 1);
                }
              }
            }}
            style={{
              position: 'absolute', top: HEADER_HEIGHT + currY, left: HEADER_WIDTH + cellX, 
              width: cw, height: h,
              background: isSelected ? 'rgba(0, 255, 204, 0.15)' : 'rgba(0,0,0,0.4)', 
              color: '#e0e0e0',
              fontWeight: isBold ? 'bold' : 'normal',
              fontStyle: isItalic ? 'italic' : 'normal',
              textDecoration: isUnderline ? 'underline' : 'none',
              borderRight: '1px solid rgba(0,255,204,0.15)', borderBottom: '1px solid rgba(0,255,204,0.15)',
              padding: '0 8px', display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap',
              fontSize: 13, zIndex: 10, outline: 'none',
              userSelect: isEditing ? 'auto' : 'none'
            }}
          >
            {val}
          </div>
        );
        cellX += cw;
      }
      currY += h;
    }
    return cells;
  };

  return (
    <div 
      style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#09090b', color: '#e0e0e0', userSelect: 'none', fontFamily: 'Inter, sans-serif', pointerEvents: 'all' }}
      onPointerDown={(e) => isEditing && e.stopPropagation()}
      onKeyDown={(e) => isEditing && e.stopPropagation()}
      onWheel={(e) => isEditing && e.stopPropagation()}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <style>{`
        .virtual-cell:focus {
          background: rgba(0, 255, 204, 0.05) !important;
          box-shadow: inset 0 0 0 2px #00ffcc, 0 0 10px rgba(0, 255, 204, 0.2) !important;
          z-index: 15 !important;
          color: #fff !important;
        }
      `}</style>


      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 24px', background: 'rgba(24, 24, 27, 0.6)', backdropFilter: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: 24, zIndex: 9, flexWrap: 'wrap' }}>
        {isEditing && (
          <>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd('undo')} style={{ background: 'transparent', border: 'none', padding: 0 }} title="Undo"><Undo size={18} style={{ cursor: 'pointer', color: '#e0e0e0' }} /></button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => execCmd('redo')} style={{ background: 'transparent', border: 'none', padding: 0 }} title="Redo"><Redo size={18} style={{ cursor: 'pointer', color: '#e0e0e0' }} /></button>
            </div>
            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />
          </>
        )}
        <span style={{cursor:'pointer', color: '#e0e0e0', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4}} onClick={() => setZoom(z => z === 100 ? 150 : 100)}>
          {zoom}% <ChevronDown size={14} />
        </span>
        {isEditing && (
          <>
            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ display: 'flex', gap: 12, color: '#e0e0e0' }}>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => toggleFormat('bold')} style={{ background: 'transparent', border: 'none', padding: 0 }} title="Bold"><Bold size={18} style={{ cursor: 'pointer', color: '#e0e0e0' }} /></button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => toggleFormat('italic')} style={{ background: 'transparent', border: 'none', padding: 0 }} title="Italic"><Italic size={18} style={{ cursor: 'pointer', color: '#e0e0e0' }} /></button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => toggleFormat('underline')} style={{ background: 'transparent', border: 'none', padding: 0 }} title="Underline"><Underline size={18} style={{ cursor: 'pointer', color: '#e0e0e0' }} /></button>
            </div>
          </>
        )}
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#050505', cursor: resizing ? (resizing.type === 'col' ? 'col-resize' : 'row-resize') : 'default' }}>
        <div 
          ref={containerRef}
          onScroll={handleScroll}
          style={{ flex: 1, overflow: 'auto', position: 'relative', transform: 'scale(' + (zoom / 100) + ')', transformOrigin: 'top left' }}
        >
          <div style={{ width: totalWidth, height: totalHeight, position: 'relative' }}>
            {renderCells()}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(10, 10, 10, 0.9)', borderTop: '1px solid rgba(0,255,204,0.1)', padding: '0 16px', height: 40, gap: 8, flexShrink: 0 }}>
        {sheets.map((sheet, idx) => (
          <div 
            key={idx}
            onClick={() => setActiveSheetIdx(idx)}
            style={{
              padding: '0 16px', height: '28px', display: 'flex', alignItems: 'center',
              background: idx === activeSheetIdx ? 'rgba(0, 255, 204, 0.15)' : 'rgba(255,255,255,0.02)',
              color: idx === activeSheetIdx ? '#00ffcc' : '#71717a',
              borderRadius: '4px',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: idx === activeSheetIdx ? '1px solid rgba(0,255,204,0.3)' : '1px solid transparent',
              transition: 'all 0.2s',
              boxShadow: idx === activeSheetIdx ? '0 0 10px rgba(0,255,204,0.1)' : 'none'
            }}
          >
            {sheet.name}
          </div>
        ))}
      </div>
    </div>
  );
}
