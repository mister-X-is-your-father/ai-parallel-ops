"use client";

import { useState } from "react";
import type { Subtask } from "./types";
import { countDone, SUBTASK_STATUS_FLOW, SUBTASK_STATUS_ICON, SUBTASK_STATUS_CLASS } from "./constants";

interface SubtaskTreeProps {
  subtasks: Subtask[];
  taskId: number;
  project: string;
  onSubtaskAction: (project: string, taskId: number, action: string, payload: Record<string, unknown>) => void;
  depth: number;
}

export default function SubtaskTree({ subtasks, taskId, project, onSubtaskAction, depth }: SubtaskTreeProps) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [addingTo, setAddingTo] = useState<number | null>(null);
  const [childInput, setChildInput] = useState("");
  const [aiUpdating, setAiUpdating] = useState<number | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");

  const toggle = (id: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAddChild = (parentId: number) => {
    if (!childInput.trim()) return;
    onSubtaskAction(project, taskId, "add", { subtaskTitle: childInput.trim(), parentSubtaskId: parentId });
    setChildInput("");
    setAddingTo(null);
  };

  const handleAiUpdate = (subtaskId: number) => {
    if (!aiPrompt.trim()) return;
    onSubtaskAction(project, taskId, "ai-update-subtask", { subtaskId: `${taskId}.${subtaskId}`, prompt: aiPrompt.trim() });
    setAiPrompt("");
    setAiUpdating(null);
  };

  return (
    <div className="space-y-0.5">
      {subtasks.map((sub) => {
        const hasChildren = (sub.subtasks?.length ?? 0) > 0;
        const isCollapsed = collapsed.has(sub.id);
        const childCounts = hasChildren ? countDone(sub.subtasks!) : null;
        const indent = depth * 12;

        return (
          <div key={sub.id}>
            <div className="flex items-center gap-1 group" style={{ paddingLeft: indent }}>
              {hasChildren ? (
                <button onClick={() => toggle(sub.id)} className="text-[8px] text-crt-gray-text w-3 text-center shrink-0">
                  {isCollapsed ? "\u25B6" : "\u25BC"}
                </button>
              ) : (
                <span className="text-[8px] text-crt-gray-text/30 w-3 text-center shrink-0">
                  {depth > 0 ? "\u2514" : "\u2500"}
                </span>
              )}

              <button
                onClick={() => onSubtaskAction(project, taskId, "updateStatus", {
                  subtaskId: sub.id,
                  subtaskStatus: SUBTASK_STATUS_FLOW[sub.status] || "pending",
                })}
                className={`text-[10px] ${SUBTASK_STATUS_CLASS[sub.status] || "text-crt-gray-text"} hover:opacity-80 transition-opacity shrink-0`}
                title={`Status: ${sub.status} (click to advance)`}
              >
                {SUBTASK_STATUS_ICON[sub.status] || "\u25cb"}
              </button>

              <span className={`text-[10px] font-mono flex-1 ${
                sub.status === "done" || sub.status === "verified"
                  ? "text-crt-gray-text line-through opacity-60"
                  : sub.status === "in-progress" ? "text-gray-200" : "text-gray-300"
              }`}>
                {sub.title}
              </span>

              {childCounts && (
                <span className="text-[8px] font-mono text-crt-gray-text bg-crt-gray/50 px-1 rounded">
                  {childCounts.done}/{childCounts.total}
                </span>
              )}

              <button
                onClick={() => setAddingTo(addingTo === sub.id ? null : sub.id)}
                className="text-[8px] text-crt-gray-text/0 group-hover:text-crt-gray-text hover:!text-crt-green transition-colors"
                title="Add child subtask"
              >+</button>

              <button
                onClick={() => { setAiUpdating(aiUpdating === sub.id ? null : sub.id); setAiPrompt(""); }}
                className="text-[8px] text-crt-gray-text/0 group-hover:text-crt-gray-text hover:!text-crt-amber transition-colors"
                title="AI update subtask"
              >&#x270E;</button>

              <button
                onClick={() => onSubtaskAction(project, taskId, "delete", { subtaskId: sub.id })}
                className="text-[9px] text-crt-gray-text/0 group-hover:text-crt-gray-text hover:!text-crt-red transition-colors"
                title="Delete subtask"
              >&#x2715;</button>
            </div>

            {aiUpdating === sub.id && (
              <div className="flex items-center gap-1 mt-0.5" style={{ paddingLeft: indent + 24 }}>
                <input
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAiUpdate(sub.id); if (e.key === "Escape") setAiUpdating(null); }}
                  placeholder="AI update prompt (Enter)"
                  className="flex-1 bg-transparent border-b border-crt-amber/30 text-[10px] font-mono text-gray-300 focus:border-crt-amber/40 focus:outline-none px-0 py-0.5 placeholder:text-crt-gray-text/30"
                  autoFocus
                />
              </div>
            )}

            {addingTo === sub.id && (
              <div className="flex items-center gap-1 mt-0.5" style={{ paddingLeft: indent + 24 }}>
                <input
                  value={childInput}
                  onChange={(e) => setChildInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddChild(sub.id); if (e.key === "Escape") setAddingTo(null); }}
                  placeholder="+ child (Enter)"
                  className="flex-1 bg-transparent border-b border-crt-gray/30 text-[10px] font-mono text-gray-300 focus:border-crt-green/40 focus:outline-none px-0 py-0.5 placeholder:text-crt-gray-text/30"
                  autoFocus
                />
              </div>
            )}

            {hasChildren && !isCollapsed && (
              <SubtaskTree subtasks={sub.subtasks!} taskId={taskId} project={project} onSubtaskAction={onSubtaskAction} depth={depth + 1} />
            )}
          </div>
        );
      })}
    </div>
  );
}
