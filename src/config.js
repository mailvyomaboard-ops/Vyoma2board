/**
 * Application Configuration & URL Resolution Service
 * Time Complexity: O(1) for all config lookups.
 * Space Complexity: O(1) string outputs.
 */

export const getApiUrl = () => {
  // Use VITE_BACKEND_URL in production, otherwise fallback to relative paths (proxied by Vite)
  return import.meta.env.VITE_BACKEND_URL || '';
};

export const getWsUrl = () => {
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
  // In production static hosting (e.g. Firebase Hosting *.web.app or *.firebaseapp.com),
  // there is no WebSocket server hosted on the static CDN. Fall back to resilient public Yjs relay.
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('web.app') || host.includes('firebaseapp.com') || host.includes('github.io')) {
      return 'wss://demos.yjs.dev/ws';
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }
  return 'wss://demos.yjs.dev/ws';
};

/**
 * Returns current authenticated token from localStorage.
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 */
export const getAuthToken = () => {
  return localStorage.getItem('token') || '';
};

/**
 * Ensures an active authentication token exists. If none is present, requests
 * a signed, short-lived guest session token from the backend.
 * Time Complexity: O(1) network overhead.
 * Space Complexity: O(1) storage.
 */
export const ensureAuthToken = async () => {
  const existing = localStorage.getItem('token');
  if (existing) return existing;

  try {
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}/api/auth/guest-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: localStorage.getItem('userName') || 'Guest Participant'
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        if (data.user && data.user.id && !localStorage.getItem('userId')) {
          localStorage.setItem('userId', data.user.id);
        }
        return data.token;
      }
    }
  } catch (err) {
    console.warn('[Config] Guest token acquisition failed, proceeding with offline state:', err);
  }
  return '';
};
