import { useState, useCallback } from 'react';

const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none' };
const contentStyle = { width: '600px', maxWidth: '90%', background: '#1e1e1e', borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', overflow: 'hidden' };
const headerStyle = { height: '60px', background: '#2d2d2d', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid #444', flexShrink: 0 };
const titleStyle = { color: '#e0e0e0', fontWeight: '500', fontSize: '15px' };
const closeButtonStyle = { background: 'transparent', border: 'none', color: 'var(--surface-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%' };
const bodyStyle = { padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' };
const fieldContainerStyle = { display: 'flex', flexDirection: 'column', gap: '8px' };
const labelStyle = { color: '#a0a0a0', fontSize: '13px' };
const selectStyle = { background: '#2d2d2d', border: '1px solid #444', color: 'var(--surface-color)', padding: '10px', borderRadius: '6px', fontSize: '14px', outline: 'none' };
const textareaStyle = { background: '#2d2d2d', border: '1px solid #444', color: 'var(--surface-color)', padding: '12px', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace', outline: 'none', resize: 'vertical', minHeight: '200px' };
const footerStyle = { display: 'flex', justifyContent: 'flex-end', marginTop: '10px' };
const saveButtonStyle = { background: 'var(--accent)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500' };

export default function ChartEditorModal({ shapeId, initialChartType, initialChartData, initialMermaidCode, onClose, editor }) {
  const [chartType, setChartType] = useState(initialChartType || 'bar');
  const [chartData, setChartData] = useState(initialChartData || '[]');
  const [mermaidCode, setMermaidCode] = useState(initialMermaidCode || '');

  const handleChartTypeChange = useCallback((e) => setChartType(e.target.value), []);
  const handleChartDataChange = useCallback((e) => setChartData(e.target.value), []);
  const handleMermaidCodeChange = useCallback((e) => setMermaidCode(e.target.value), []);

  const handleSave = useCallback(() => {
    try {
      if (chartType !== 'mermaid') {
        if (chartData.length > 50000) throw new Error("Payload too large");
        JSON.parse(chartData);
      } else {
        if (mermaidCode.length > 50000) throw new Error("Payload too large");
      }
    } catch (e) {
      alert(e.message === "Payload too large" ? "Data payload exceeds security limits." : "Invalid JSON data format. Please correct it before saving.");
      return;
    }

    editor.updateShape({
      id: shapeId,
      type: 'milanote-chart',
      props: {
        chartType,
        chartData,
        mermaidCode
      }
    });
    
    onClose();
  }, [chartType, chartData, mermaidCode, editor, shapeId, onClose]);

  const stopPropagation = useCallback((e) => {
    e.stopPropagation();
  }, []);

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose} 
      style={overlayStyle}
      onPointerDown={stopPropagation}
      onPointerMove={stopPropagation}
      onPointerUp={stopPropagation}
      onWheel={stopPropagation}
    >
      <div 
        className="modal-content" 
        style={contentStyle}
        onClick={stopPropagation}
      >
        <style>{`
          .modal-content * {
            user-select: text !important;
            -webkit-user-select: text !important;
          }
        `}</style>
        <div style={headerStyle}>
          <div style={titleStyle}>
            Edit Chart Data
          </div>
          <button onClick={onClose} style={closeButtonStyle}>
            <X size={18} />
          </button>
        </div>
        
        <div style={bodyStyle}>
          
          <div style={fieldContainerStyle}>
            <label style={labelStyle}>Chart Type</label>
            <select 
              value={chartType} 
              onChange={handleChartTypeChange}
              style={selectStyle}
            >
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="pie">Pie Chart</option>
              <option value="mermaid">Flowchart / Diagram (Mermaid)</option>
            </select>
          </div>

          <div style={fieldContainerStyle}>
            <label style={labelStyle}>
              {chartType === 'mermaid' ? 'Mermaid Code' : 'JSON Data'}
            </label>
            
            {chartType === 'mermaid' ? (
              <textarea
                value={mermaidCode}
                onChange={handleMermaidCodeChange}
                style={textareaStyle}
                placeholder="graph TD\n  A-->B;"
              />
            ) : (
              <textarea
                value={chartData}
                onChange={handleChartDataChange}
                style={textareaStyle}
                placeholder='[{"name": "Jan", "value": 400}]'
              />
            )}
          </div>

          <div style={footerStyle}>
            <button 
              onClick={handleSave}
              style={saveButtonStyle}
            >
              <Save size={16} /> Save Changes
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}
