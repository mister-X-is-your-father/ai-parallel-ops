"use client";

import { useEffect, useRef, useCallback } from "react";
import { useDashboardStore } from "./stores/dashboard-store";

interface WSMessage {
  type: string;
  data: unknown;
}

export function useWebSocketSync(url: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const { setTasks, setProjects, setConnected } = useDashboardStore();

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        setTimeout(connect, 2000);
      };
      ws.onerror = () => ws.close();

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          if (msg.type === "tasks-update") {
            setTasks(msg.data as Record<string, unknown>);
          } else if (msg.type === "projects-update") {
            setProjects(msg.data as Record<string, string>);
          }
        } catch {}
      };
    } catch {
      setTimeout(connect, 2000);
    }
  }, [url, setTasks, setProjects, setConnected]);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);
}

// Keep old hook for backwards compat (wraps store)
export function useTaskWebSocket(url: string) {
  useWebSocketSync(url);
  const tasks = useDashboardStore((s) => s.tasks);
  const projects = useDashboardStore((s) => s.projects);
  const connected = useDashboardStore((s) => s.connected);
  return { tasks, projects, connected };
}
