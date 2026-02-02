"use client";

import { useState } from "react";
import type { Task } from "./types";

interface TaskCardSectionsProps {
  task: Task;
  project: string;
  showAiUpdate: boolean;
  onHideAiUpdate: () => void;
  onEdit: (project: string, taskId: number, fields: { description: string }) => void;
  onTaskMasterAction?: (project: string, taskId: number, action: string, params?: Record<string, unknown>) => void;
}

export default function TaskCardSections({ task, project, showAiUpdate, onHideAiUpdate, onEdit, onTaskMasterAction }: TaskCardSectionsProps) {
  const [aiUpdatePrompt, setAiUpdatePrompt] = useState("");
  const [aiUpdating, setAiUpdating] = useState(false);

  const handleAiUpdate = async () => {
    if (!aiUpdatePrompt.trim() || !onTaskMasterAction) return;
    setAiUpdating(true);
    await onTaskMasterAction(project, task.id, "ai-update", { prompt: aiUpdatePrompt.trim() });
    setAiUpdating(false);
    onHideAiUpdate();
    setAiUpdatePrompt("");
  };

  return (
    <>
      {/* Description */}
      {task.description && (
        <p className={`text-[10px] text-crt-gray-text mb-2 leading-relaxed ${task.status === "done" || task.status === "review" ? "" : "line-clamp-2"}`}>{task.description}</p>
      )}

      {/* Paused instructions */}
      {task.status === "paused" && (
        <div className="mb-2 p-2 rounded border border-crt-amber/30 bg-crt-amber/5">
          <span className="text-[8px] font-mono text-crt-amber tracking-wider block mb-1">PAUSED - ADD INSTRUCTIONS</span>
          <textarea
            defaultValue={task.description}
            onBlur={(e) => { if (e.target.value.trim() !== task.description) onEdit(project, task.id, { description: e.target.value.trim() }); }}
            rows={2}
            className="w-full bg-crt-black border border-crt-gray/50 rounded px-2 py-1 text-[10px] font-mono text-gray-300 focus:border-crt-amber/40 focus:outline-none resize-y leading-relaxed"
            placeholder="Add detailed instructions before resuming..."
          />
        </div>
      )}

      {/* AI Update */}
      {showAiUpdate && (
        <div className="mb-2 p-2 rounded border border-crt-amber/30 bg-crt-amber/5">
          <label className="text-[8px] font-mono text-crt-amber tracking-wider block mb-1">AI UPDATE PROMPT</label>
          <textarea value={aiUpdatePrompt} onChange={(e) => setAiUpdatePrompt(e.target.value)} rows={2} autoFocus
            className="w-full bg-crt-black border border-crt-gray/50 rounded px-2 py-1 text-[10px] font-mono text-gray-300 focus:border-crt-amber/40 focus:outline-none resize-y leading-relaxed"
            placeholder="Describe how to update this task..." />
          <div className="flex gap-1.5 mt-1.5">
            <button onClick={onHideAiUpdate} className="px-2 py-0.5 text-[8px] font-mono rounded border border-crt-gray text-crt-gray-text">CANCEL</button>
            <button onClick={handleAiUpdate} disabled={aiUpdating || !aiUpdatePrompt.trim()}
              className="px-2 py-0.5 text-[8px] font-mono rounded border border-crt-amber/40 bg-crt-amber/10 text-crt-amber"
              style={aiUpdating ? { opacity: 0.5 } : undefined}>{aiUpdating ? "UPDATING..." : "UPDATE"}</button>
          </div>
        </div>
      )}

      {/* Acceptance criteria — data-gated, not status-gated */}
      {task.acceptanceCriteria && task.acceptanceCriteria.length > 0 && (
        <div className="mb-2 border border-crt-green/20 rounded bg-crt-black/30 px-2 py-1.5">
          <div className="text-[8px] font-mono text-crt-green tracking-wider mb-1">ACCEPTANCE CRITERIA</div>
          {task.acceptanceCriteria.map((criterion, i) => (
            <div key={i} className="flex items-start gap-1.5 py-0.5">
              <span className="text-[10px] text-crt-gray-text shrink-0">&#x25cb;</span>
              <span className="text-[10px] font-mono text-gray-300 leading-relaxed">{criterion}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
