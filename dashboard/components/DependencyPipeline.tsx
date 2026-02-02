"use client";

import TaskCard from "./task-card";
import type { Task } from "@/lib/domain/types";

interface DependencyPipelineProps {
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

export default function DependencyPipeline({
  tasks, projectName, taskNameMap, allTaskIds,
  onExecute, onStatusChange, onEdit, onSubtaskAction, onOpenChat, onTaskMasterAction,
}: DependencyPipelineProps) {
  const phases = new Map<number, Task[]>();
  for (const t of tasks) {
    const d = t.depth ?? 0;
    if (!phases.has(d)) phases.set(d, []);
    phases.get(d)!.push(t);
  }
  const sortedPhases = [...phases.entries()].sort((a, b) => a[0] - b[0]);

  if (sortedPhases.length === 0) {
    return (
      <div className="text-center py-8 text-[10px] text-crt-gray-text/30 font-mono">
        No dependent tasks
      </div>
    );
  }

  return (
    <div className="flex divide-x divide-crt-gray min-h-[120px] overflow-x-auto">
      {sortedPhases.map(([depth, phaseTasks], idx) => {
        const allDone = phaseTasks.every((t) => t.status === "done" || t.status === "verified");
        const anyActive = phaseTasks.some((t) => t.status === "in-progress");
        const allWaiting = phaseTasks.every((t) => (t.blockedBy?.length ?? 0) > 0);

        let phaseColor = "text-crt-gray-text";
        let phaseBg = "";
        if (allDone) { phaseColor = "glow-cyan"; phaseBg = "bg-crt-cyan/5"; }
        else if (anyActive) { phaseColor = "glow-green"; phaseBg = "bg-crt-green/5"; }
        else if (allWaiting) { phaseColor = "glow-red"; phaseBg = "bg-crt-red/5"; }

        return (
          <div key={depth} className={`flex flex-col min-w-[160px] sm:min-w-[220px] flex-1 ${phaseBg}`}>
            <div className="px-3 py-1.5 border-b border-crt-gray/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                {idx > 0 && <span className="text-[10px] text-crt-gray-text/40">{"\u25c0"}</span>}
                <span className={`font-display text-[9px] tracking-widest ${phaseColor}`}>PHASE {depth}</span>
                {allDone && <span className="text-[8px] glow-cyan">{"\u2713"}</span>}
              </div>
              <span className="text-[9px] font-mono text-crt-gray-text bg-crt-gray px-1 rounded">{phaseTasks.length}</span>
            </div>
            {depth > 0 && (
              <div className="px-3 py-1 border-b border-crt-gray/30 bg-crt-dark/30">
                <span className="text-[8px] font-mono text-crt-gray-text/60">REQUIRES PHASE {depth - 1}</span>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {phaseTasks.map((task) => (
                <TaskCard key={task.id} task={task} project={projectName}
                  taskNameMap={taskNameMap} allTaskIds={allTaskIds}
                  onExecute={onExecute} onStatusChange={onStatusChange}
                  onEdit={onEdit} onSubtaskAction={onSubtaskAction}
                  onOpenChat={onOpenChat} onTaskMasterAction={onTaskMasterAction} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
