import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { db } from './firebase';
import { doc, getDoc, updateDoc, Bytes } from 'firebase/firestore';

// We'll use a public server for demo/testing until the backend 403 is fixed
const WS_URL = 'wss://demos.yjs.dev/ws'; 

export function useYjsStore({ roomId }) {
  const [store, setStore] = useState({
    status: 'loading',
    doc: null,
    provider: null,
    awareness: null,
    elementsMap: null,
    customCardsMap: null,
    roomConfigMap: null
  });

  useEffect(() => {
    if (!roomId) {
      setStore(s => ({ ...s, status: 'error' }));
      return;
    }
    let provider = null;
    const ydoc = new Y.Doc();
    const elementsMap = ydoc.getMap('excalidraw-elements');
    const customCardsMap = ydoc.getMap('custom-cards');
    const roomConfigMap = ydoc.getMap('room-config');

    let timeoutId = null;

    const initialize = async () => {
      try {
        const roomRef = doc(db, 'rooms', roomId);
        const roomSnap = await getDoc(roomRef);
        if (roomSnap.exists()) {
          const data = roomSnap.data();
          if (data.yjsState) {
            const uint8array = data.yjsState.toUint8Array();
            Y.applyUpdate(ydoc, uint8array);
          }
        }
      } catch (err) {
        console.error("Failed to load initial Yjs state from Firebase:", err);
      }

      // Room ID is prefixed to prevent collisions on public servers
      provider = new WebsocketProvider(WS_URL, `vyoma2board-${roomId}`, ydoc);

      provider.on('status', event => {
        setStore(s => ({
          ...s,
          status: event.status === 'connected' ? 'connected' : 'loading'
        }));
      });

      setStore({
        status: 'connecting',
        doc: ydoc,
        provider,
        awareness: provider.awareness,
        elementsMap,
        customCardsMap,
        roomConfigMap
      });

      // Save state on updates, debounced by 2.5s
      ydoc.on('update', () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          try {
            const state = Y.encodeStateAsUpdate(ydoc);
            const bytes = Bytes.fromUint8Array(state);
            const roomRef = doc(db, 'rooms', roomId);
            await updateDoc(roomRef, { yjsState: bytes });
          } catch (err) {
            console.error("Failed to save Yjs state to Firebase:", err);
          }
        }, 2500);
      });
    };

    initialize();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (provider) provider.destroy();
      ydoc.destroy();
    };
  }, [roomId]);

  return store;
}
