import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { db } from './firebase';
import { doc, updateDoc, Bytes, onSnapshot } from 'firebase/firestore';
import { getWsUrl, getAuthToken, ensureAuthToken } from './config';

/**
 * Custom React hook for authenticated Yjs document synchronization and awareness.
 * Connects to the internal secure backend WebSocket endpoint (/yjs) instead of public relays.
 * Time Complexity: O(1) connection setup; O(U) update propagation where U is delta size.
 * Space Complexity: O(E) where E is total elements in the CRDT document.
 */
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
    let isDisposed = false;

    const initialize = async () => {
      // Ensure we have a valid token (signed JWT or ephemeral guest token)
      let token = getAuthToken();
      if (!token) {
        token = await ensureAuthToken();
      }
      if (isDisposed) return;

      // Subscribe to real-time Firebase updates as a fallback channel if configured
      try {
        if (db) {
          const roomRef = doc(db, 'rooms', roomId);
          unsubscribeSnapshot = onSnapshot(roomRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.yjsState) {
                const uint8array = data.yjsState.toUint8Array();
                // Apply with origin 'firebase' so we don't reflect this update back
                Y.applyUpdate(ydoc, uint8array, 'firebase');
              }
            }
          }, (err) => {
            console.warn('[useYjsStore] Firebase snapshot subscription failed, using WebSocket:', err);
          });
        }
      } catch (err) {
        console.warn('[useYjsStore] Firestore fallback skipped:', err);
      }

      // Connect to the authenticated backend Yjs WebSocket server
      const wsUrl = `${getWsUrl()}/yjs`;
      const providerOpts = token ? { params: { token } } : {};
      provider = new WebsocketProvider(wsUrl, roomId, ydoc, providerOpts);

      provider.on('status', event => {
        if (isDisposed) return;
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

      // Save state on updates, debounced by 2.5s (to database/backend)
      ydoc.on('update', (update, origin) => {
        if (origin === 'firebase') return;
        
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          try {
            if (db) {
              const state = Y.encodeStateAsUpdate(ydoc);
              const bytes = Bytes.fromUint8Array(state);
              const roomRef = doc(db, 'rooms', roomId);
              await updateDoc(roomRef, { yjsState: bytes });
            }
          } catch (err) {
            // Silently catch persistence failures if offline
          }
        }, 2500);
      });
    };

    initialize();

    return () => {
      isDisposed = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      if (provider) provider.destroy();
      ydoc.destroy();
    };
  }, [roomId]);

  return store;
}
