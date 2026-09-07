import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// We'll use a public server for demo/testing until the backend 403 is fixed
const WS_URL = 'wss://demos.yjs.dev/ws'; 

export function useYjsStore({ roomId }) {
  const [store, setStore] = useState({
    status: 'loading',
    doc: null,
    provider: null,
    awareness: null,
    elementsMap: null,
    customCardsMap: null
  });

  useEffect(() => {
    if (!roomId) {
      setStore(s => ({ ...s, status: 'error' }));
      return;
    }

    const doc = new Y.Doc();
    const elementsMap = doc.getMap('excalidraw-elements');
    const customCardsMap = doc.getMap('custom-cards');

    // Room ID is prefixed to prevent collisions on public servers
    const provider = new WebsocketProvider(WS_URL, `vyoma2board-${roomId}`, doc);

    provider.on('status', event => {
      setStore(s => ({
        ...s,
        status: event.status === 'connected' ? 'connected' : 'loading'
      }));
    });

    setStore({
      status: 'connecting',
      doc,
      provider,
      awareness: provider.awareness,
      elementsMap,
      customCardsMap
    });

    return () => {
      provider.destroy();
      doc.destroy();
    };
  }, [roomId]);

  return store;
}
