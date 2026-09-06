import { getWsUrl } from './config';
let socket = null;
let roomId = null;
let myId = 'media-sync-user';
let reconnectTimer = null;
const listeners = new Set();
const pending = [];

export function startMediaSync(id) {
  if (socket && roomId === id && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket;
  }
  if (socket) {
    socket.onclose = null;
    socket.close();
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  roomId = id;
  myId = 'media-sync-' + (localStorage.getItem('userId') || Math.random().toString(36).substring(2, 9));

  const connect = () => {
    const token = localStorage.getItem('token') || (import.meta.env.DEV ? 'dev-mode-token-12345' : '');
    const wsUrl = `${getWsUrl()}/?room=${encodeURIComponent(roomId)}&type=sync&id=${encodeURIComponent(myId)}&token=${encodeURIComponent(token)}`;
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'join',
        roomId,
        userId: myId,
        name: 'Media Sync',
        color: '#111111',
        hidden: true
      }));
      while (pending.length) socket.send(pending.shift());
    };

    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'media-sync') {
          listeners.forEach((fn) => fn(data));
        }
      } catch (err) {
        console.error('media-sync parse error', err);
      }
    };

    socket.onclose = () => {
      if (!roomId) return;
      reconnectTimer = setTimeout(connect, 3000);
    };

    socket.onerror = () => socket.close();
  };

  connect();
  return socket;
}

export function stopMediaSync() {
  roomId = null;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.onclose = null;
    socket.close();
    socket = null;
  }
}

export function getMediaSenderId() {
  return myId;
}

export function isMediaSyncReady() {
  return !!socket && socket.readyState === WebSocket.OPEN && !!roomId;
}

export function publishMediaSync(payload) {
  if (!roomId) return false;
  const msg = JSON.stringify({ type: 'media-sync', roomId, media: payload, by: myId });
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(msg);
    return true;
  }
  if (socket && socket.readyState === WebSocket.CONNECTING) {
    pending.push(msg);
    return true;
  }
  return false;
}

export function subscribeMediaSync(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
