import React, { useEffect } from 'react';
import { 
  SandpackProvider, 
  SandpackLayout, 
  SandpackCodeEditor, 
  SandpackPreview, 
  SandpackFileExplorer,
  useSandpack,
  useActiveCode
} from "@codesandbox/sandpack-react";

// Helper component to track code changes and sync back to whiteboard
function CodeChangeTracker({ onCodeChange, onFileChange, onFileCreate, mainFileName, originalFiles }) {
  const { sandpack } = useSandpack();
  const { code } = useActiveCode();

  useEffect(() => {
    // Only fire if the active file is our main file
    if (sandpack.activeFile === '/' + (mainFileName || 'App.js')) {
      if (onCodeChange) onCodeChange(code);
    } else {
      // Find the file in our whiteboard files
      const matchName = sandpack.activeFile.substring(1); // remove leading slash
      const matchedNode = originalFiles.find(f => f.name === matchName);
      if (matchedNode && onFileChange) {
        onFileChange(matchedNode.id, code);
      }
    }
  }, [code, sandpack.activeFile]);

  useEffect(() => {
    // Check if there are newly created files in sandpack
    const currentFiles = Object.keys(sandpack.files);
    const oldFileNames = ['/' + (mainFileName || 'App.js'), ...originalFiles.map(f => '/' + f.name)];
    const addedFiles = currentFiles.filter(f => !oldFileNames.includes(f) && !f.startsWith('/node_modules') && f !== '/package.json' && f !== '/public/index.html');
    
    if (addedFiles.length > 0 && onFileCreate) {
      addedFiles.forEach(f => {
         const newName = f.substring(1);
         // Ensure we don't duplicate
         if (!originalFiles.find(of => of.name === newName)) {
            onFileCreate(newName, sandpack.files[f].code);
         }
      });
    }
  }, [sandpack.files, originalFiles.length]);

  return null;
}

export default function SandpackWebIDE({
  mainFileName,
  code,
  files = [],
  onCodeChange,
  onFileChange,
  onFileCreate,
  height = '100%'
}) {
  const sandpackFiles = {
    ['/' + (mainFileName || 'App.js')]: { code: code, active: true },
  };

  files.forEach(f => {
    sandpackFiles['/' + f.name] = f.content || '';
  });

  return (
    <div style={{ width: '100%', height, display: 'flex', flexDirection: 'column' }}>
      <SandpackProvider 
        template="react" 
        files={sandpackFiles}
        theme="dark"
        style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        <SandpackLayout style={{ height: '100%', borderRadius: 0, border: 'none' }}>
          <SandpackFileExplorer style={{ minWidth: '180px' }} autoHiddenFiles />
          <SandpackCodeEditor style={{ height: '100%' }} showLineNumbers showTabs closableTabs />
          {/* Include Preview alongside Explorer/Editor */}
          <SandpackPreview style={{ height: '100%', minWidth: '300px' }} showOpenInCodeSandbox={false} />
        </SandpackLayout>
        <CodeChangeTracker 
          onCodeChange={onCodeChange} 
          onFileChange={onFileChange} 
          onFileCreate={onFileCreate}
          mainFileName={mainFileName} 
          originalFiles={files} 
        />
      </SandpackProvider>
    </div>
  );
}
