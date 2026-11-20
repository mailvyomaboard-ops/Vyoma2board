import React from 'react';

export default function PPTViewer({ fileData, onClose }) {
  if (!fileData) return null;

  // For robust viewing of PPTX files without relying on unstable client-side parsers,
  // we use the Microsoft Office Online viewer iframe which works natively for public URLs.
  const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileData.url)}`;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <iframe
        src={viewerUrl}
        width="100%"
        height="100%"
        frameBorder="0"
        title="PowerPoint Viewer"
        style={{ flex: 1 }}
      >
        This browser does not support IFrames.
      </iframe>
    </div>
  );
}