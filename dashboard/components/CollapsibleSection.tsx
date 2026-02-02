"use client";

import { useState } from "react";
import TaskCard from "./task-card";
import type { Task } from "@/lib/domain/types";

interface CollapsibleSectionProps {
  label: string;
  icon: string;
  colorClass: string;
  tasks: Task[];
  projectName: string;
  taskNameMap: Map<number, string>;
  allTaskIds: number[];
  onExecute: (task: Task, project: string) => void;
  onStatusChange: (project: string, taskId: number, status: string) => void;
  onEdit: (project: string, taskId: number, fields: { title?: string; description?: string }) => void;
  onSubtaskAction: (project: string, taskId: number, action: string, payload: Record<string, unknown>) => void;
  onOpenChat: (task: Task, project: string) => void;
  onTaskMasterAction: (project: string, taskId: number, action: string, params?: Record<string, unknown>) => void;
}

export default function CollapsibleSection({
  label, icon, colorClass, tasks, projectName, taskNameMap, allTaskIds,
  onExecute, onStatusChange, onEdit, onSubtaskAction, onOpenChat, onTaskMasterAction,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(false);

  if (tasks.length === 0) return null;

  return (
    <div className="border-t border-crt-gray/40">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-1.5 flex items-center justify-between bg-crt-dark/50 hover:bg-crt-gray/20 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-crt-gray-text font-mono">{open ? "\u25BC" : "\u25B6"}</span>
          <span className={`text-[10px] ${colorClass}`}>{icon}</span>
          <span className={`font-display text-[9px] tracking-widest ${colorClass}`}>{label}</span>
        </div>
        <span className="text-[9px] font-mono text-crt-gray-text bg-crt-gray px-1 rounded">{tasks.length}</span>
      </button>
      {open && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 p-2 bg-crt-black/20">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} project={projectName}
              taskNameMap={taskNameMap} allTaskIds={allTaskIds}
              onExecute={onExecute} onStatusChange={onStatusChange}
              onEdit={onEdit} onSubtaskAction={onSubtaskAction}
              onOpenChat={onOpenChat} onTaskMasterAction={onTaskMasterAction} />
          ))}
        </div>
      )}
    </div>
  );
}
