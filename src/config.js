export const getApiUrl = () => {
  // Use VITE_BACKEND_URL in production, otherwise fallback to relative paths (which Vite proxies to backend)
  return import.meta.env.VITE_BACKEND_URL || '';
};

export const getWsUrl = () => {
  // Use VITE_WS_URL if explicitly set
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  
  // If VITE_BACKEND_URL is set (e.g. https://my-backend.onrender.com), derive the WS URL from it
  if (import.meta.env.VITE_BACKEND_URL) {
    const url = new URL(import.meta.env.VITE_BACKEND_URL);
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${url.host}`;
  }

  // Fallback to current host (for local dev proxy)
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
};
