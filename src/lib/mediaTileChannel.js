// Media tile channel: shares camera / screen streams on the canvas through the
// app's own /comms WebSocket server (the same signaling that powers the voice
// call), using native RTCPeerConnection. This replaces the old PeerJS-based
// tiles which relied on PeerJS's public cloud + a dead public TURN server.
//
// Signaling protocol (reuses the /comms offer/answer/ice-candidate routing):
//   - The sharer owns a tile identified by `mediaId`. Viewers send an offer
//     targeted at the sharer's comms userId (`sharerId` stored on the shape).
//   - The sharer answers every viewer with its captured stream.
//   - ICE candidates are relayed both ways through /comms.

import { getWsUrl } from './config';
let socket = null;
let roomId = null;
let myUserId = null;
let reconnectTimer = null;
const pending = [];

const sharedTiles = new Map();  // mediaId -> { stream, streamType, hostName, pcs, iceQueues }
const watchedTiles = new Map(); // mediaId -> { pc, iceQueue, sharerId, onStream, onStatus, onError, retryTimer, attempts, done }

// Mirror the exact ICE config that makes the voice call work: public STUN
// plus the openrelay.metered.ca TURN relay. Without a TURN relay, remote
// viewers behind a NAT end up with a black tile because ICE can never
// connect across the network.
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
];

function send(data) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
    return true;
  }
  if (socket && socket.readyState === WebSocket.CONNECTING) {
    pending.push(data);
    return true;
  }
  return false;
}

export function startMediaTileChannel(id) {
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
  myUserId = 'mtile-' + (localStorage.getItem('userId') || Math.random().toString(36).substring(2, 9)) + '-' + Math.random().toString(36).substring(2, 7);

  const connect = () => {
    const token = localStorage.getItem('token') || (import.meta.env.DEV ? 'dev-mode-token-12345' : '');
    const wsUrl = `${getWsUrl()}/comms?token=${encodeURIComponent(token)}`;
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'join', roomId, userId: myUserId, name: 'Media Tile', color: '#111111', hidden: true }));
      while (pending.length) socket.send(JSON.stringify(pending.shift()));
    };

    socket.onmessage = (e) => handleMessage(e.data);

    socket.onclose = () => {
      if (!roomId) return;
      reconnectTimer = setTimeout(connect, 3000);
    };
    socket.onerror = () => socket.close();
  };

  connect();
  return socket;
}

export function stopMediaTileChannel() {
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
  sharedTiles.forEach((t) => {
    t.pcs.forEach((pc) => {
      try { pc.close(); } catch (err) { /* ignore */ }
    });
  });
  sharedTiles.clear();
  watchedTiles.forEach((w) => {
    if (w.retryTimer) clearInterval(w.retryTimer);
    if (w.pc) { try { w.pc.close(); } catch (err) { /* ignore */ } }
  });
  watchedTiles.clear();
}

export function getMediaTileUserId() {
  return myUserId;
}

export function shareMediaTile({ mediaId, stream, streamType, hostName }) {
  const tile = { stream, streamType, hostName, pcs: new Map(), iceQueues: new Map() };
  sharedTiles.set(mediaId, tile);
  return {
    stop() {
      const t = sharedTiles.get(mediaId);
      if (t) {
        t.pcs.forEach((pc) => {
          try { pc.close(); } catch (err) { /* ignore */ }
        });
        sharedTiles.delete(mediaId);
      }
    }
  };
}

export function watchMediaTile({ mediaId, sharerId, onStream, onStatus, onError }) {
  if (watchedTiles.has(mediaId)) return () => {};

  const watcher = {
    pc: null,
    iceQueue: [],
    sharerId,
    onStream,
    onStatus,
    onError,
    retryTimer: null,
    attempts: 0,
    done: false
  };
  watchedTiles.set(mediaId, watcher);

  const clearRetry = () => {
    if (watcher.retryTimer) {
      clearInterval(watcher.retryTimer);
      watcher.retryTimer = null;
    }
  };

  const begin = () => {
    if (watcher.done || watcher.pc) return;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    watcher.pc = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        send({ type: 'ice-candidate', roomId, targetId: sharerId, userId: myUserId, mediaId, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      watcher.done = true;
      clearRetry();
      // Some browsers deliver ontrack with an empty streams array; fall back
      // to bundling the raw track so the video element always has a srcObject.
      const remoteStream = e.streams && e.streams[0]
        ? e.streams[0]
        : new MediaStream([e.track]);
      if (watcher.onStream) watcher.onStream(remoteStream);
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      // Only report media actually flowing as 'connected' — a bare ICE/DTLS
      // connection without a stream is what previously left the tile black.
      if (s === 'connected' && watcher.onStatus) watcher.onStatus('connecting');
      else if (s === 'failed') {
        clearRetry();
        if (watcher.onStatus) watcher.onStatus('error');
        if (watcher.onError) watcher.onError('Could not connect to the stream');
      } else if ((s === 'disconnected' || s === 'closed') && !watcher.done) {
        if (watcher.onStatus) watcher.onStatus('connecting');
      }
    };

    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => {
        send({ type: 'offer', roomId, targetId: sharerId, userId: myUserId, mediaId, offer: pc.localDescription });
      })
      .catch((err) => {
        if (watcher.onError) watcher.onError(err.message);
      });
  };

  // The sharer might connect to /comms after us, so keep re-offering until
  // the stream arrives (queued messages are flushed once the socket opens).
  watcher.retryTimer = setInterval(() => {
    if (watcher.done) {
      clearRetry();
      return;
    }
    watcher.attempts++;
    if (watcher.attempts > 20) {
      clearRetry();
      if (watcher.onError) watcher.onError('Timed out waiting for the stream');
      if (watcher.onStatus) watcher.onStatus('error');
      return;
    }
    if (watcher.pc) {
      try { watcher.pc.close(); } catch (err) { /* ignore */ }
      watcher.pc = null;
    }
    begin();
  }, 2000);

  begin();

  return () => {
    watcher.done = true;
    clearRetry();
    if (watcher.pc) {
      try { watcher.pc.close(); } catch (err) { /* ignore */ }
    }
    watchedTiles.delete(mediaId);
  };
}

async function handleMessage(raw) {
  try {
    const data = JSON.parse(raw);
    if (!data.mediaId) return;

    if (data.type === 'offer') {
      await handleOffer(data);
    } else if (data.type === 'answer') {
      await handleAnswer(data);
    } else if (data.type === 'ice-candidate') {
      await handleIce(data);
    }
  } catch (err) {
    console.error('media tile channel error', err);
  }
}

// Sharer side: a viewer wants our stream.
async function handleOffer(data) {
  const tile = sharedTiles.get(data.mediaId);
  if (!tile || data.targetId !== myUserId) return;
  const viewerId = data.userId;

  let pc = tile.pcs.get(viewerId);
  if (pc) {
    try { pc.close(); } catch (err) { /* ignore */ }
  }
  pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  tile.pcs.set(viewerId, pc);

  tile.stream.getTracks().forEach((t) => pc.addTrack(t, tile.stream));

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      send({ type: 'ice-candidate', roomId, targetId: viewerId, userId: myUserId, mediaId: data.mediaId, candidate: e.candidate });
    }
  };
  pc.onconnectionstatechange = () => {
    const s = pc.connectionState;
    if (s === 'disconnected' || s === 'failed' || s === 'closed') {
      try { pc.close(); } catch (err) { /* ignore */ }
      tile.pcs.delete(viewerId);
    }
  };

  await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
  const queued = tile.iceQueues.get(viewerId) || [];
  tile.iceQueues.delete(viewerId);
  for (const c of queued) {
    try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (err) { /* ignore */ }
  }

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  send({ type: 'answer', roomId, targetId: viewerId, userId: myUserId, mediaId: data.mediaId, answer: pc.localDescription });
}

// Viewer side: the sharer answered our offer.
async function handleAnswer(data) {
  const watcher = watchedTiles.get(data.mediaId);
  if (!watcher || data.targetId !== myUserId || data.userId !== watcher.sharerId) return;
  const pc = watcher.pc;
  if (!pc || pc.remoteDescription) return;

  await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
  watcher.done = true;
  while (watcher.iceQueue.length) {
    try { await pc.addIceCandidate(new RTCIceCandidate(watcher.iceQueue.shift())); } catch (err) { /* ignore */ }
  }
}

async function handleIce(data) {
  // If we are the viewer of this tile, route to our receiving pc.
  const watcher = watchedTiles.get(data.mediaId);
  if (watcher && data.userId === watcher.sharerId) {
    const pc = watcher.pc;
    if (!pc) return;
    if (pc.remoteDescription) {
      try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch (err) { /* ignore */ }
    } else {
      watcher.iceQueue.push(data.candidate);
    }
    return;
  }

  // Otherwise we may be the sharer relaying a viewer's candidate.
  const tile = sharedTiles.get(data.mediaId);
  if (tile) {
    const pc = tile.pcs.get(data.userId);
    if (pc && pc.remoteDescription) {
      try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch (err) { /* ignore */ }
    } else {
      if (!tile.iceQueues.has(data.userId)) tile.iceQueues.set(data.userId, []);
      tile.iceQueues.get(data.userId).push(data.candidate);
    }
  }
}

