import { create } from "zustand";
import type { Task } from "@/lib/domain/types";

interface ModalState {
  execute: { task: Task; project: string } | null;
  batch: { tasks: Task[]; project: string } | null;
  create: string | null; // project name
  chat: { task: Task; project: string; mode?: "chat" | "breakdown" } | null;
}

interface DashboardStore {
  // Data (WebSocket-driven)
  tasks: Record<string, unknown>;
  projects: Record<string, string>;
  connected: boolean;

  // UI State
  enabledProjects: Set<string>;
  collapsedProjects: Set<string>;
  batchRunningProject: string | null;

  // Modal State
  modals: ModalState;

  // Data setters
  setTasks(tasks: Record<string, unknown>): void;
  setProjects(projects: Record<string, string>): void;
  setConnected(connected: boolean): void;

  // UI actions
  toggleProject(project: string): void;
  setEnabledProjects(projects: Set<string>): void;
  toggleCollapse(project: string): void;
  setBatchRunning(project: string | null): void;

  // Modal actions
  openExecute(task: Task, project: string): void;
  openBatch(tasks: Task[], project: string): void;
  openCreate(project: string): void;
  openChat(task: Task, project: string, mode?: "chat" | "breakdown"): void;
  closeModal(modal: keyof ModalState): void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  tasks: {},
  projects: {},
  connected: false,
  enabledProjects: new Set(),
  collapsedProjects: new Set(),
  batchRunningProject: null,
  modals: { execute: null, batch: null, create: null, chat: null },

  setTasks: (tasks) => set({ tasks }),
  setProjects: (projects) => set({ projects }),
  setConnected: (connected) => set({ connected }),

  toggleProject: (project) =>
    set((s) => {
      const next = new Set(s.enabledProjects);
      if (next.has(project)) next.delete(project); else next.add(project);
      return { enabledProjects: next };
    }),

  setEnabledProjects: (projects) => set({ enabledProjects: projects }),

  toggleCollapse: (project) =>
    set((s) => {
      const next = new Set(s.collapsedProjects);
      if (next.has(project)) next.delete(project); else next.add(project);
      return { collapsedProjects: next };
    }),

  setBatchRunning: (project) => set({ batchRunningProject: project }),

  openExecute: (task, project) =>
    set((s) => ({ modals: { ...s.modals, execute: { task, project } } })),
  openBatch: (tasks, project) =>
    set((s) => ({ modals: { ...s.modals, batch: { tasks, project } } })),
  openCreate: (project) =>
    set((s) => ({ modals: { ...s.modals, create: project } })),
  openChat: (task, project, mode) =>
    set((s) => ({ modals: { ...s.modals, chat: { task, project, mode } } })),
  closeModal: (modal) =>
    set((s) => ({ modals: { ...s.modals, [modal]: null } })),
}));
