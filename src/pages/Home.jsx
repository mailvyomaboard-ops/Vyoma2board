import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Users, FileCode, PenTool, ArrowRight } from 'lucide-react';
import '../index.css';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--accent-purple)',
      padding: 'clamp(12px, 3vw, 24px)',
      overflowX: 'hidden',
      boxSizing: 'border-box'
    }}>
      {/* Navigation */}
      <nav className="neo-window home-nav" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', marginBottom: '40px', background: 'var(--accent-yellow)', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="neo-badge" style={{ background: 'var(--accent-blue)' }}>
            <Layout size={24} />
          </div>
          <span className="neo-title-block" style={{ margin: 0, transform: 'rotate(0deg)', fontSize: '20px', padding: '8px 16px', background: 'var(--surface-color)' }}>Vyomaboard</span>
        </div>
        
        {/* Top Right Login/Signup */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => navigate('/auth')} className="neo-btn" style={{ background: 'var(--surface-color)' }}>Login</button>
          <button onClick={() => navigate('/auth')} className="neo-btn" style={{ background: 'var(--accent-pink)' }}>Sign Up</button>
        </div>
      </nav>

      {/* Hero Section */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', padding: '0 8px' }}>
        
        <div className="neo-title-block" style={{ fontSize: 'clamp(32px, 8vw, 64px)', transform: 'rotate(-2deg)', background: 'var(--accent-green)', padding: 'clamp(14px, 3vw, 24px) clamp(20px, 5vw, 48px)', wordBreak: 'break-word', maxWidth: '100%' }}>
          VYOMABOARD
        </div>
        
        <span className="neo-badge" style={{ fontSize: 'clamp(14px, 3.5vw, 20px)', background: 'var(--accent-orange)', transform: 'rotate(1deg)', maxWidth: '90vw', lineHeight: '1.4', padding: '8px 16px', textAlign: 'center', whiteSpace: 'normal' }}>
          The limitless whiteboard for engineering teams to draw, code, and share in real-time.
        </span>

        <button onClick={() => navigate('/auth')} className="neo-btn" style={{ background: 'var(--accent-yellow)', fontSize: 'clamp(18px, 4vw, 24px)', padding: 'clamp(12px, 3vw, 16px) clamp(24px, 6vw, 48px)', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '24px' }}>
          Get Started <ArrowRight size={24} />
        </button>

        {/* Features Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', marginTop: 'clamp(40px, 8vw, 80px)', width: '100%', maxWidth: '800px', textAlign: 'left', marginBottom: '80px' }}>
          
          {/* Feature 1: Rooms */}
          <div className="neo-window" style={{ transform: 'rotate(1deg)' }}>
            <div className="neo-window-header" style={{ background: 'var(--accent-pink)' }}>
                <div className="neo-window-dot red"></div>
                <div className="neo-window-dot yellow"></div>
                <div className="neo-window-dot green"></div>
                <span className="neo-badge" style={{ marginLeft: 'auto', background: 'var(--surface-color)', fontSize: '12px' }}>Feature 01</span>
            </div>
            <div className="neo-window-content home-feature-content" style={{ display: 'flex', gap: '24px', alignItems: 'center', background: 'var(--surface-color)' }}>
              <div className="neo-badge" style={{ background: 'var(--accent-yellow)', padding: 'clamp(16px, 3vw, 24px)', flexShrink: 0 }}>
                <Users size={36} />
              </div>
              <div>
                <span className="neo-badge" style={{ marginBottom: '12px', background: 'var(--accent-green)', display: 'inline-block' }}>Multiplayer Rooms</span>
                <p style={{ fontWeight: '600', fontSize: 'clamp(14px, 2.5vw, 16px)', margin: 0, padding: '12px', border: '3px solid #000', background: 'var(--accent-purple)' }}>
                  Join dedicated workspaces instantly. See your teammates' cursors fly across the screen as you brainstorm and architect systems together with zero latency.
                </p>
              </div>
            </div>
          </div>

          {/* Feature 2: File Sharing & Execution */}
          <div className="neo-window" style={{ transform: 'rotate(-1deg)' }}>
            <div className="neo-window-header" style={{ background: 'var(--accent-blue)' }}>
                <div className="neo-window-dot red"></div>
                <div className="neo-window-dot yellow"></div>
                <div className="neo-window-dot green"></div>
                <span className="neo-badge" style={{ marginLeft: 'auto', background: 'var(--surface-color)', fontSize: '12px' }}>Feature 02</span>
            </div>
            <div className="neo-window-content home-feature-content" style={{ display: 'flex', gap: '24px', alignItems: 'center', background: 'var(--surface-color)' }}>
              <div className="neo-badge" style={{ background: 'var(--accent-orange)', padding: 'clamp(16px, 3vw, 24px)', flexShrink: 0 }}>
                <FileCode size={36} />
              </div>
              <div>
                <span className="neo-badge" style={{ marginBottom: '12px', background: 'var(--accent-pink)', display: 'inline-block' }}>Live Code Execution</span>
                <p style={{ fontWeight: '600', fontSize: 'clamp(14px, 2.5vw, 16px)', margin: 0, padding: '12px', border: '3px solid #000', background: 'var(--accent-yellow)' }}>
                  Drop folders of code onto the canvas. Edit multiple files side-by-side, and compile them in the cloud directly from the whiteboard.
                </p>
              </div>
            </div>
          </div>

          {/* Feature 3: Drawing */}
          <div className="neo-window" style={{ transform: 'rotate(1deg)' }}>
            <div className="neo-window-header" style={{ background: 'var(--accent-green)' }}>
                <div className="neo-window-dot red"></div>
                <div className="neo-window-dot yellow"></div>
                <div className="neo-window-dot green"></div>
                <span className="neo-badge" style={{ marginLeft: 'auto', background: 'var(--surface-color)', fontSize: '12px' }}>Feature 03</span>
            </div>
            <div className="neo-window-content home-feature-content" style={{ display: 'flex', gap: '24px', alignItems: 'center', background: 'var(--surface-color)' }}>
              <div className="neo-badge" style={{ background: 'var(--accent-purple)', padding: 'clamp(16px, 3vw, 24px)', flexShrink: 0 }}>
                <PenTool size={36} />
              </div>
              <div>
                <span className="neo-badge" style={{ marginBottom: '12px', background: 'var(--accent-blue)', display: 'inline-block' }}>Infinite Drawing</span>
                <p style={{ fontWeight: '600', fontSize: 'clamp(14px, 2.5vw, 16px)', margin: 0, padding: '12px', border: '3px solid #000', background: 'var(--accent-orange)' }}>
                  An endless canvas for diagrams, sticky notes, and thought mapping without running out of space.
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
