export const getApiUrl = () => {
  // Use VITE_BACKEND_URL in production, otherwise fallback to relative paths (which Vite proxies to backend)
  return import.meta.env.VITE_BACKEND_URL || '';
};

export const getWsUrl = () => {
  // y-webrtc doesn't use this - it connects to free public signaling servers directly
  // This is kept for any legacy WebSocket usage (e.g., CallManager)
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  if (import.meta.env.VITE_BACKEND_URL) {
    const url = new URL(import.meta.env.VITE_BACKEND_URL);
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${url.host}`;
  }
  if (import.meta.env.DEV) {
    return 'ws://localhost:1234';
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
};
