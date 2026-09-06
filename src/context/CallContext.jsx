import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { getWsUrl } from '../config';

const CallContext = createContext(null);

export const useCallContext = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCallContext must be used within a CallProvider');
  }
  return context;
};

export const CallProvider = ({ children, roomId }) => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isCallHidden, setIsCallHidden] = useState(false);
  const [callMode, setCallMode] = useState(null); // 'video' or 'screen'
  
  // activeUsers tracks everyone in the room (presence)
  const [activeUsers, setActiveUsers] = useState([]);
  
  // callUsers tracks users currently in a WebRTC call
  const [callUsers, setCallUsers] = useState([]);
  
  const [localStream, setLocalStream] = useState(null);
  
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const [chatMessages, setChatMessages] = useState([]);
  const [dmHistory, setDmHistory] = useState([]);

  const wsRef = useRef(null);
  const peersRef = useRef({});
  const iceCandidateQueue = useRef({});
  const localStreamRef = useRef(null);
  
  // Maintain a stable reference to myUserId, adding a random suffix so multiple tabs (same user) get distinct signaling IDs for local testing
  const [myUserId] = useState(() => {
    const baseId = localStorage.getItem('userId') || 'anon-' + Math.random().toString(36).substring(7);
    const tabSuffix = Math.random().toString(36).substring(2, 6);
    return `${baseId}-${tabSuffix}`;
  });
  const myUserIdRef = useRef(myUserId);
  myUserIdRef.current = myUserId;

  const isLocalNetwork = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.') || window.location.hostname.startsWith('10.');
  
  const configuration = {
    iceServers: isLocalNetwork ? [] : [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  const createPeerConnection = useCallback((targetId) => {
    if (peersRef.current[targetId]) return peersRef.current[targetId];

    const pc = new RTCPeerConnection(configuration);
    peersRef.current[targetId] = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.onicecandidate = (e) => {
      if (e.candidate && wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          roomId,
          targetId,
          userId: myUserIdRef.current,
          candidate: e.candidate
        }));
      }
    };

    pc.ontrack = (e) => {
      setCallUsers(prev => prev.map(u => {
        if (u.id === targetId) {
          return { ...u, stream: e.streams[0] };
        }
        return u;
      }));
    };

    return pc;
  }, [roomId]);

  // Connect to WebSocket immediately for presence & chat
  useEffect(() => {
    if (!roomId) return;
    
    let active = true;
    const token = localStorage.getItem('token') || (import.meta.env.DEV ? 'dev-mode-token-12345' : '');
    const wsUrl = `${getWsUrl()}/comms?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!active) return;
      const accentColor = JSON.parse(localStorage.getItem('themeAccent') || '{"hex": "#92a9e1"}');
      ws.send(JSON.stringify({
        type: 'join',
        roomId,
        userId: myUserIdRef.current,
        name: localStorage.getItem('userName') || 'You',
        color: accentColor.hex
      }));
    };

    ws.onmessage = async (msg) => {
      if (!active) return;
      try {
        const data = JSON.parse(msg.data);
        
        if (data.type === 'user-joined') {
          setActiveUsers(prev => {
            if (prev.find(u => u.id === data.userId)) return prev;
            return [...prev, { id: data.userId, name: data.name, color: data.color, isLocal: false }];
          });
        }

        if (data.type === 'user-left') {
          setActiveUsers(prev => prev.filter(u => u.id !== data.userId));
          setCallUsers(prev => prev.filter(u => u.id !== data.userId));
          if (peersRef.current[data.userId]) {
            peersRef.current[data.userId].close();
            delete peersRef.current[data.userId];
          }
        }

        if (data.type === 'kicked') {
          alert("You have been kicked from the room by the host.");
          window.location.href = '/dashboard';
        }

        // Chat & DM
        if (data.type === 'chat-message') {
          setChatMessages(prev => [...prev, data.message]);
        }
        if (data.type === 'chat-history') {
          setChatMessages(prev => [...prev, ...data.messages]);
        }
        if (data.type === 'chat-dm') {
          setDmHistory(prev => [...prev, { from: data.userId, to: data.targetId, message: data.message }]);
        }
        if (data.type === 'dm-history') {
          setDmHistory(prev => [...prev, ...data.messages]);
        }

        // WebRTC Signaling
        if (data.type === 'join-call') {
          setCallUsers(prev => {
            if (prev.find(u => u.id === data.userId)) return prev;
            return [...prev, { id: data.userId, name: data.name, color: data.color, isLocal: false, stream: null, mode: data.mode }];
          });

          if (isCallActive && myUserIdRef.current > data.userId) {
            const pc = createPeerConnection(data.userId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ws.send(JSON.stringify({
              type: 'offer',
              roomId,
              targetId: data.userId,
              userId: myUserIdRef.current,
              offer
            }));
          }
        }

        if (data.type === 'leave-call') {
          setCallUsers(prev => prev.filter(u => u.id !== data.userId));
          if (peersRef.current[data.userId]) {
            peersRef.current[data.userId].close();
            delete peersRef.current[data.userId];
          }
        }

        if (data.type === 'update-mode') {
          setCallUsers(prev => prev.map(u => u.id === data.userId ? { ...u, mode: data.mode } : u));
        }

        if (data.type === 'offer' && isCallActive) {
          const pc = createPeerConnection(data.userId);
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          
          if (iceCandidateQueue.current[data.userId]) {
            for (const candidate of iceCandidateQueue.current[data.userId]) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            iceCandidateQueue.current[data.userId] = [];
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({
            type: 'answer',
            roomId,
            targetId: data.userId,
            userId: myUserIdRef.current,
            answer
          }));
        }

        if (data.type === 'answer' && isCallActive) {
          const pc = peersRef.current[data.userId];
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            if (iceCandidateQueue.current[data.userId]) {
              for (const candidate of iceCandidateQueue.current[data.userId]) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              }
              iceCandidateQueue.current[data.userId] = [];
            }
          }
        }

        if (data.type === 'ice-candidate' && isCallActive) {
          const pc = peersRef.current[data.userId];
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } else {
            if (!iceCandidateQueue.current[data.userId]) {
              iceCandidateQueue.current[data.userId] = [];
            }
            iceCandidateQueue.current[data.userId].push(data.candidate);
          }
        }
      } catch (err) {
        console.error("WebSocket message error", err);
      }
    };

    return () => {
      active = false;
      ws.close();
    };
  }, [roomId, isCallActive, createPeerConnection]);

  const joinCall = async (mode = 'video') => {
    setCallMode(mode);
    setIsCallActive(true);

    let stream;
    try {
      if (mode === 'screen') {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        stream.getVideoTracks()[0].onended = () => leaveCall();
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      }
      
      setLocalStream(stream);
      localStreamRef.current = stream;
      
      const accentColor = JSON.parse(localStorage.getItem('themeAccent') || '{"hex": "#92a9e1"}');
      const localUser = {
        id: myUserIdRef.current,
        name: localStorage.getItem('userName') || 'You',
        isLocal: true,
        stream: stream,
        color: accentColor.hex,
        mode: mode
      };
      setCallUsers([localUser]);
      
      if (wsRef.current && wsRef.current.readyState === 1) {
        wsRef.current.send(JSON.stringify({
          type: 'join-call',
          roomId,
          userId: myUserIdRef.current,
          name: localUser.name,
          color: localUser.color,
          mode
        }));
      }
    } catch (err) {
      console.error("Media access denied", err);
      setIsCallActive(false);
      setCallMode(null);
    }
  };

  const leaveCall = () => {
    setIsCallActive(false);
    setIsCallHidden(false);
    setCallMode(null);
    setCallUsers([]);
    
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({
        type: 'leave-call',
        roomId,
        userId: myUserIdRef.current
      }));
    }

    Object.values(peersRef.current).forEach(pc => pc.close());
    peersRef.current = {};
    iceCandidateQueue.current = {};
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
  };

  const toggleScreenShare = async () => {
    if (!localStream) return;
    try {
      if (callMode === 'video') {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const screenTrack = displayStream.getVideoTracks()[0];
        
        localStream.getVideoTracks().forEach(t => t.stop());
        const oldTrack = localStream.getVideoTracks()[0];
        if (oldTrack) localStream.removeTrack(oldTrack);
        localStream.addTrack(screenTrack);
        
        Object.values(peersRef.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });

        screenTrack.onended = () => {
          toggleScreenShare(); // revert
        };

        setCallMode('screen');
        if (wsRef.current && wsRef.current.readyState === 1) {
          wsRef.current.send(JSON.stringify({
            type: 'update-mode',
            roomId,
            userId: myUserIdRef.current,
            mode: 'screen'
          }));
        }
        setCallUsers(prev => prev.map(u => u.isLocal ? { ...u, mode: 'screen' } : u));
      } else {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const camTrack = camStream.getVideoTracks()[0];
        
        localStream.getVideoTracks().forEach(t => t.stop());
        const oldTrack = localStream.getVideoTracks()[0];
        if (oldTrack) localStream.removeTrack(oldTrack);
        localStream.addTrack(camTrack);
        
        Object.values(peersRef.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(camTrack);
        });

        setCallMode('video');
        if (wsRef.current && wsRef.current.readyState === 1) {
          wsRef.current.send(JSON.stringify({
            type: 'update-mode',
            roomId,
            userId: myUserIdRef.current,
            mode: 'video'
          }));
        }
        setCallUsers(prev => prev.map(u => u.isLocal ? { ...u, mode: 'video' } : u));
      }
    } catch (err) {
      console.error("Failed to toggle screen share", err);
    }
  };

  const sendChatMessage = (text) => {
    if (!text.trim() || !wsRef.current || wsRef.current.readyState !== 1) return;
    const newMsg = {
      id: Date.now(),
      user: localStorage.getItem('userName') || 'You',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    wsRef.current.send(JSON.stringify({
      type: 'chat-message',
      roomId,
      message: newMsg
    }));
  };

  const sendDirectMessage = (targetId, text) => {
    if (!text.trim() || !wsRef.current || wsRef.current.readyState !== 1) return;
    const newMsg = {
      id: Date.now(),
      user: localStorage.getItem('userName') || 'You',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    wsRef.current.send(JSON.stringify({
      type: 'chat-dm',
      roomId,
      targetId,
      userId: myUserIdRef.current,
      message: newMsg
    }));
  };

  const kickUser = (targetId) => {
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({
        type: 'kick-user',
        roomId,
        targetId,
        userId: myUserIdRef.current
      }));
    }
  };

  useEffect(() => {
    return () => leaveCall();
  }, [roomId]);

  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !isMicMuted);
      localStream.getVideoTracks().forEach(track => track.enabled = !isVideoOff);
    }
  }, [isMicMuted, isVideoOff, localStream]);

  return (
    <CallContext.Provider value={{
      myUserId: myUserIdRef.current,
      activeUsers,
      callUsers,
      chatMessages,
      dmHistory,
      sendChatMessage,
      sendDirectMessage,
      kickUser,
      
      isCallActive,
      isCallHidden,
      setIsCallHidden,
      callMode,
      joinCall,
      leaveCall,
      toggleScreenShare,
      localStream,
      isMicMuted,
      setIsMicMuted,
      isVideoOff,
      setIsVideoOff
    }}>
      {children}
    </CallContext.Provider>
  );
};

