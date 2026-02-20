import { useEffect, useState } from 'react';
import type { ActivityEvent } from '../lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const useSSE = () => {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      if (closed) {
        return;
      }

      eventSource = new EventSource(`${API_BASE}/api/activity`);

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as ActivityEvent;
          setEvents((prev) => [parsed, ...prev].slice(0, 200));
        } catch {
          // ignore malformed events
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource?.close();

        if (!closed) {
          reconnectTimer = setTimeout(() => {
            connect();
          }, 2000);
        }
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      eventSource?.close();
    };
  }, []);

  return { events, isConnected };
};
