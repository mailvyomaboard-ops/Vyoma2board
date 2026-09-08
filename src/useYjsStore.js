import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { db } from './firebase';
import { doc, updateDoc, Bytes, onSnapshot } from 'firebase/firestore';

export function useYjsStore({ roomId, localUserId }) {
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
    let unsubscribeSnapshot = null;

    const initialize = async () => {
      // Subscribe to real-time Firebase updates as a fallback channel
      const roomRef = doc(db, 'rooms', roomId);
      unsubscribeSnapshot = onSnapshot(roomRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.yjsState) {
            const uint8array = data.yjsState.toUint8Array();
            // Apply with origin 'firebase' so we don't reflect this update back to the database
            Y.applyUpdate(ydoc, uint8array, 'firebase');
          }
        }
      });

      // Use y-websocket for reliable awareness and fallback sync
      provider = new WebsocketProvider('wss://demos.yjs.dev/ws', `vyoma2board-${roomId}`, ydoc);

      provider.on('status', event => {
        setStore(s => ({
          ...s,
          status: event.status === 'connected' ? 'connected' : 'connecting'
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
      ydoc.on('update', (update, origin) => {
        // Don't save updates that came from firebase back to firebase
        if (origin === 'firebase') return;
        
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
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      if (provider) provider.destroy();
      ydoc.destroy();
    };
  }, [roomId]);

  return store;
}
