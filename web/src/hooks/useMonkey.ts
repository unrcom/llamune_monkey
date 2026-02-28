import { useEffect, useState } from 'react';
import type { InstanceInfo } from '../types';

const WS_URL = 'ws://localhost:4000/ws/status';

export function useMonkey() {
  const [instances, setInstances] = useState<InstanceInfo[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (e) => {
      try {
        setInstances(JSON.parse(e.data));
      } catch {
        // ignore
      }
    };

    return () => ws.close();
  }, []);

  return { instances, connected };
}
