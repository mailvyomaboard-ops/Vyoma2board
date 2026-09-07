import { useRef, useState } from 'react';

export const InteractiveBlock = ({ id, label, shape, editor, showUI }) => {
  const blocks = shape.props.blocks || {};
  const data = blocks[id];
  const fileInputRef = useRef(null);
  
  const [isEditingText, setIsEditingText] = useState(false);
  const [editText, setEditText] = useState('');
  
  const isImageOnly = ['LOGO', 'MOCKUP', 'STICKER', 'ICON', 'PATTERN'].includes(label);
  const isTextOnly = ['FONTS', 'TEXT', 'NOTES', 'GOALS', 'CAREER', 'SOCIAL', 'FINANCIAL', 'PERSONAL DEVELOPMENTS', 'HEALTH', 'MENTAL', 'BELIEFS', 'THINGS TO TRY'].includes(label.toUpperCase());

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target.result;
      editor.updateShape({ id: shape.id, type: shape.type, props: { blocks: { ...shape.props.blocks, [id]: { type: 'image', url } } } });
    };
    reader.readAsDataURL(file);
  };

  if (!data) {
     if (isEditingText) {
       return (
         <div style={{ flex: 1, position: 'relative', padding: '16px' }}>
            <textarea 
              autoFocus
              onBlur={() => {
                setIsEditingText(false);
                if (editText.trim()) {
                  editor.updateShape({ id: shape.id, type: shape.type, props: { blocks: { ...shape.props.blocks, [id]: { type: 'text', text: editText } } } });
                }
              }}
              onChange={(e) => setEditText(e.target.value)}
              value={editText}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', resize: 'none', padding: '16px', zIndex: 20, backgroundColor: 'white' }}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onKeyUp={(e) => e.stopPropagation()}
            />
         </div>
       );
     }

     return (
       <div 
         style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '16px' }}
       >
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" style={{ display: 'none' }} />
          
          <div
             className="interactive-block-btn"
             style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                display: 'flex',
                gap: '8px',
                zIndex: 50,
             }}
          >
             <button
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => {
                   e.stopPropagation();
                   if (isImageOnly) {
                      fileInputRef.current?.click();
                   } else {
                      setEditText('');
                      setIsEditingText(true);
                   }
                }}
                style={{
                   position: 'absolute', inset: 0, width: '100%', height: '100%',
                   background: 'transparent', border: 'none', color: 'inherit',
                   fontSize: '20px', fontWeight: 'bold', cursor: 'pointer',
                   display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
             >
                {label || 'Add Text'}
             </button>

             {!isImageOnly && !isTextOnly && (
                <button
                   onPointerDown={(e) => e.stopPropagation()}
                   onPointerUp={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                   }}
                   style={{
                      position: 'absolute', bottom: 12, right: 12,
                      background: 'white', color: '#333', border: '1px solid #CCC',
                      borderRadius: '8px', padding: '6px 12px', fontSize: '12px',
                      cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', gap: '4px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                   }}
                   title="Upload Image"
                >
                   🖼️ Image
                </button>
             )}
          </div>
       </div>
     );
  }
  
  if (data.type === 'image') {
     return (
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <img src={data.url} alt={label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} draggable={false} />
           {showUI && (
              <button 
                 onPointerDown={(e) => { e.stopPropagation(); const b = {...shape.props.blocks}; delete b[id]; editor.updateShape({ id: shape.id, type: shape.type, props: { blocks: b } }); }}
                 style={{ position: 'absolute', top: 12, right: 12, background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', zIndex: 10 }}>
                 ×
              </button>
           )}
        </div>
     );
  }
  
  if (data.type === 'text') {
     return (
        <div 
           style={{ flex: 1, position: 'relative', padding: 16, fontSize: '18px', textAlign: 'left', overflow: 'auto', whiteSpace: 'pre-wrap', cursor: 'text' }}
           onPointerDown={(e) => {
              if (e.detail === 2) {
                 e.stopPropagation();
                 setEditText(data.text);
                 setIsEditingText(true);
              }
           }}
        >
           {isEditingText ? (
             <textarea 
               autoFocus
               onBlur={() => {
                 setIsEditingText(false);
                 editor.updateShape({ id: shape.id, type: shape.type, props: { blocks: { ...shape.props.blocks, [id]: { type: 'text', text: editText } } } });
               }}
               onChange={(e) => setEditText(e.target.value)}
               value={editText}
               style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', resize: 'none', padding: '16px', zIndex: 20, backgroundColor: 'white' }}
               onPointerDown={(e) => e.stopPropagation()}
               onKeyDown={(e) => e.stopPropagation()}
               onKeyUp={(e) => e.stopPropagation()}
             />
           ) : (
             data.text
           )}
           {showUI && !isEditingText && (
              <button 
                 onPointerDown={(e) => { e.stopPropagation(); const b = {...shape.props.blocks}; delete b[id]; editor.updateShape({ id: shape.id, type: shape.type, props: { blocks: b } }); }}
                 style={{ position: 'absolute', top: 4, right: 4, background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', zIndex: 10 }}>
                 ×
              </button>
           )}
        </div>
     );
  }
  return null;
};
