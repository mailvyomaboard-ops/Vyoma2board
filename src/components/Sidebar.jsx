import React, { useState } from 'react';
import { 
  Type, CheckSquare, Grid, Folder, Video, MonitorUp, FileCode, ImageIcon, 
  Layout, Settings, MessageSquare, Phone, MicOff, Mic, VideoOff 
} from 'lucide-react';
import '../index.css'; // Assume neo-brutalist styles are here

export default function Sidebar({ 
  isOpen, 
  onAddShape, 
  onShowTemplates, 
  onShowThemeSettings, 
  isChatOpen, 
  setIsChatOpen,
  isCallActive,
  setIsCallActive,
  isCallHidden,
  setIsCallHidden,
  isMicMuted,
  setIsMicMuted,
  isVideoOff,
  setIsVideoOff,
  onUploadFile
}) {
  return (
    <div className={`milanote-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-tools">
        <button className="tool-btn" onClick={() => onAddShape('milanote-card')}>
          <Type size={20} />
          <span>Note</span>
        </button>

        <button className="tool-btn" onClick={() => onAddShape('milanote-board')}>
          <Grid size={20} />
          <span>Create Nested Board</span>
        </button>

        <button className="tool-btn" onClick={() => window.dispatchEvent(new CustomEvent('open-video-call'))}>
          <Video size={20} />
          <span>Video Call</span>
        </button>
        <button className="tool-btn" onClick={() => onAddShape('milanote-file')}>
          <FileCode size={20} />
          <span>Create File</span>
        </button>
        <button className="tool-btn" onClick={() => document.getElementById('sidebar-file-upload').click()}>
          <ImageIcon size={20} />
          <span>Upload File</span>
        </button>
        <input 
          type="file" 
          id="sidebar-file-upload" 
          style={{ display: 'none' }} 
          multiple
          onChange={(e) => {
            if (e.target.files && onUploadFile) {
              onUploadFile(e.target.files);
              e.target.value = ''; // Reset input
            }
          }} 
        />
        <button className="tool-btn" onClick={() => onShowTemplates && onShowTemplates()}>
          <Layout size={20} />
          <span>Templates</span>
        </button>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '20px' }}>

        <button className="tool-btn" onClick={() => onShowThemeSettings && onShowThemeSettings()}>
          <Settings size={20} />
          <span>Theme Settings</span>
        </button>
      </div>
    </div>
  );
}
