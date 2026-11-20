import React, { useState } from 'react';
import { X, Layout, MessageSquare, Lightbulb, Grid, Wrench } from 'lucide-react';
import { TEMPLATE_CATEGORIES } from '../templates.jsx';
import '../index.css';

const iconMap = {
  Layout: <Layout size={24} />,
  MessageSquare: <MessageSquare size={24} />,
  Lightbulb: <Lightbulb size={24} />,
  Wrench: <Wrench size={24} />,
  default: <Grid size={24} />
};

export default function TemplatesModal({ onClose, onSelectTemplate }) {
  const [activeCategory, setActiveCategory] = useState(TEMPLATE_CATEGORIES[0].id);
  const currentCategory = TEMPLATE_CATEGORIES.find(c => c.id === activeCategory);

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div className="neo-window" style={{ width: '900px', height: '70vh', maxWidth: '95vw' }}>
        
        {/* Header */}
        <div className="neo-window-header" style={{ background: 'var(--accent-pink)', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="neo-window-dot red"></div>
            <div className="neo-window-dot yellow"></div>
            <div className="neo-window-dot green"></div>
            <span style={{ fontWeight: '900', textTransform: 'uppercase', marginLeft: '12px' }}>Vyomaboard Templates</span>
          </div>
          <button className="neo-btn" onClick={onClose} style={{ padding: '4px', background: 'var(--surface-color)' }}>
            <X size={20} />
          </button>
        </div>
        
        {/* Body (2 columns) */}
        <div className="neo-window-content" style={{ display: 'flex', padding: 0, overflow: 'hidden', background: 'var(--surface-color)' }}>
          
          {/* Sidebar */}
          <div style={{
            width: '240px',
            borderRight: '3px solid #000',
            background: 'var(--accent-purple)',
            overflowY: 'auto',
            padding: '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {TEMPLATE_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="neo-btn"
                style={{
                  background: activeCategory === cat.id ? 'var(--surface-color)' : 'transparent',
                  border: activeCategory === cat.id ? '3px solid #000' : '3px solid transparent',
                  boxShadow: activeCategory === cat.id ? '2px 2px 0px #000' : 'none',
                  textAlign: 'left',
                  padding: '12px'
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Grid Area */}
          <div style={{
            flex: 1,
            padding: '24px',
            overflowY: 'auto',
            background: '#f8fafc'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '24px', fontWeight: 900, textTransform: 'uppercase' }}>
              {currentCategory?.name.replace(/[^a-zA-Z &]/g, '').trim()} Templates
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '24px'
            }}>
              {currentCategory?.templates.map(template => (
                <div 
                  key={template.id}
                  onClick={() => {
                    onSelectTemplate(template);
                    onClose();
                  }}
                  className="neo-card"
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    transition: 'transform 0.1s',
                    padding: '16px'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translate(-4px, -4px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translate(0px, 0px)'}
                >
                  <div style={{
                    width: '48px', height: '48px',
                    border: '3px solid #000',
                    background: 'var(--accent-yellow)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '2px 2px 0px #000'
                  }}>
                    {iconMap[template.icon] || iconMap.default}
                  </div>
                  
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 800 }}>{template.name}</h4>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#333', lineHeight: '1.4' }}>
                      {template.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
