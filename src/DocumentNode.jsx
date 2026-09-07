import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { FileText, FileSpreadsheet, Presentation, File, Image } from 'lucide-react';

const getIconForType = (name) => {
  const ext = (name || '').split('.').pop().toLowerCase();
  if (['doc', 'docx'].includes(ext)) return <FileText size={32} color="#2b579a" />;
  if (['xls', 'xlsx'].includes(ext)) return <FileSpreadsheet size={32} color="#217346" />;
  if (['ppt', 'pptx'].includes(ext)) return <Presentation size={32} color="#6b7280" />;
  if (ext === 'pdf') return <File size={32} color="#e3242b" />;
  if (['png', 'jpg', 'jpeg'].includes(ext)) return <Image size={32} color="#4b5563" />;
  return <File size={32} color="#4b5563" />;
};

const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

const handleTargetStyle = { opacity: 0 };
const handleSourceStyle = { opacity: 0 };

const DocumentNode = ({ data, selected }) => {
  const handleDoubleClick = React.useCallback(() => {
    if (data?.onDoubleClick && data?.fileData) {
      data.onDoubleClick(data.fileData);
    }
  }, [data]);

  return (
    <>
      <div 
        className={`milanote-card ${selected ? 'selected' : ''}`} 
        onDoubleClick={handleDoubleClick}
      >
        <div className="card-icon">
          {getIconForType(data?.label || '')}
        </div>
        <div className="card-label">{data?.label || ''}</div>
        <div className="card-meta">
          {data?.fileData?.size ? formatBytes(data.fileData.size) : 'File'}
        </div>
      </div>
      <Handle type="target" position={Position.Left} style={handleTargetStyle} />
      <Handle type="source" position={Position.Right} style={handleSourceStyle} />
    </>
  );
};

export default memo(DocumentNode);
