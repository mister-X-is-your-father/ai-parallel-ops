"use client";

import { useState } from "react";
import { getReview, suggestFollowUpTasks } from "@/lib/actions/git";
import type { Task } from "./types";

interface TaskCardActionsProps {
  task: Task;
  project: string;
  isBlocked: boolean;
  onExecute: (task: Task, project: string) => void;
  onStatusChange: (project: string, taskId: number, status: string) => void;
  onShowDetail: () => void;
  onShowReview: (data: ReviewData) => void;
  onShowSuggestions: (suggestions: { title: string; description: string }[]) => void;
}

export interface ReviewData {
  diffStat: string; diff: string; log: string; untracked: string;
  startCommit: string; headCommit: string;
}

export default function TaskCardActions({
  task, project, isBlocked, onExecute, onStatusChange,
  onShowDetail, onShowReview, onShowSuggestions,
}: TaskCardActionsProps) {
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [suggestLoading, setSuggestLoading] = useState(false);

  const handleReview = async () => {
    if (!task.startCommit) { onShowDetail(); return; }
    setReviewLoading(true);
    setReviewError("");
    try {
      const result = await getReview({ project, startCommit: task.startCommit!, branch: task.branch });
      if (!result.success) throw new Error(result.error);
      onShowReview(result.data as ReviewData);
    } catch (err: unknown) {
      setReviewError(err instanceof Error ? err.message : String(err));
    }
    setReviewLoading(false);
  };

  const handleSuggest = async () => {
    setSuggestLoading(true);
    try {
      const data = await suggestFollowUpTasks({
        project, taskId: String(task.id), taskTitle: task.title,
        taskDescription: task.description, startCommit: task.startCommit,
        branch: task.branch, acceptanceCriteria: task.acceptanceCriteria,
      });
      onShowSuggestions(data.suggestions || []);
    } catch {}
    setSuggestLoading(false);
  };

  const status = task.status;
  const change = (s: string) => () => onStatusChange(project, task.id, s);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1">
        <span className="text-[9px] text-crt-gray-text font-mono">{project}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {status === "pending" && (
          <button onClick={() => !isBlocked && onExecute(task, project)} className="btn-execute flex items-center gap-1" disabled={isBlocked}
            style={isBlocked ? { opacity: 0.35, cursor: "not-allowed", borderColor: "rgba(107, 114, 128, 0.25)" } : undefined}>
            <span>&#x25B6;</span><span>EXEC</span>
          </button>
        )}
        {status === "in-progress" && (<>
          <button onClick={change("paused")} className="btn-icon spinner-btn" title="Pause">
            <span className="spinner-ring" /><span className="spinner-inner">&#x23F8;</span>
          </button>
          <button onClick={change("pending")} className="btn-icon" style={{ color: "#6b7280" }} title="Stop (back to TODO)">&#x25A0;</button>
        </>)}
        {status === "paused" && (<>
          <button onClick={change("in-progress")} className="btn-icon" style={{ color: "var(--crt-green)" }} title="Resume">&#x25B6;</button>
          <button onClick={change("done")} className="btn-icon" style={{ color: "var(--crt-cyan)" }} title="Mark done (move to CHECK)">&#x2713;</button>
          <button onClick={change("pending")} className="btn-icon" style={{ color: "#6b7280" }} title="Cancel (back to TODO)">&#x2715;</button>
        </>)}
        {(status === "done" || status === "review") && (<>
          <button onClick={handleReview} className="btn-icon" style={{ color: "var(--crt-cyan)" }} title={task.startCommit ? "Review git diff" : "Review details"}>
            {reviewLoading ? "\u23F3" : "\u{1F50D}"}
          </button>
          <button onClick={change("verified")} className="btn-execute flex items-center gap-1"
            style={{ borderColor: "rgba(96, 165, 250, 0.25)", color: "rgb(96, 165, 250)", background: "rgba(96, 165, 250, 0.08)" }} title="Approve — mark as verified">
            <span>&#x2714;</span><span>APPROVE</span>
          </button>
          <button onClick={handleSuggest} className="btn-icon" style={{ color: "var(--crt-amber)" }} title="Suggest follow-up tasks">
            {suggestLoading ? "\u23F3" : "\u{1F4CB}"}
          </button>
          <button onClick={change("in-progress")} className="btn-icon" style={{ color: "var(--crt-red)" }} title="Reject — send back to RUNNING">&#x21A9;</button>
          <button onClick={change("pending")} className="btn-icon" style={{ color: "#6b7280" }} title="Reopen — back to TODO">&#x21BA;</button>
        </>)}
        {status === "verified" && (
          <button onClick={change("pending")} className="btn-execute flex items-center gap-1"
            style={{ borderColor: "rgba(107, 114, 128, 0.25)", color: "#6b7280", background: "rgba(107, 114, 128, 0.08)" }}>
            <span>&#x21BA;</span><span>REOPEN</span>
          </button>
        )}
        {reviewError && <span className="text-[9px] font-mono text-crt-red">{reviewError}</span>}
      </div>
    </div>
  );
}
