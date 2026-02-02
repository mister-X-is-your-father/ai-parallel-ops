"use client";

import { useState } from "react";
import { createPr } from "@/lib/actions/git";
import type { Task } from "./types";

interface TaskCardPrLinkProps {
  task: Task;
  project: string;
}

export default function TaskCardPrLink({ task, project }: TaskCardPrLinkProps) {
  const [prCreating, setPrCreating] = useState(false);
  const [prUrl, setPrUrl] = useState(task.prUrl || "");
  const [prError, setPrError] = useState("");

  // Data-gated: show when branch exists, regardless of status
  if (!task.branch) return null;

  const handleCreatePr = async () => {
    setPrCreating(true);
    setPrError("");
    try {
      const result = await createPr({
        project, taskId: String(task.id), taskTitle: task.title,
        branch: task.branch!, startCommit: task.startCommit,
      });
      if (!result.success) throw new Error(result.error);
      setPrUrl((result.data as { prUrl: string }).prUrl);
    } catch (err: unknown) {
      setPrError(err instanceof Error ? err.message : String(err));
    }
    setPrCreating(false);
  };

  return (
    <div className="mb-2">
      {prUrl ? (
        <a href={prUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-2 py-1.5 rounded border border-crt-green/20 bg-crt-green/5 text-[10px] font-mono text-crt-green hover:bg-crt-green/10 transition-colors">
          <span>&#x1F517;</span>
          <span className="truncate">{prUrl}</span>
        </a>
      ) : (
        <div className="flex items-center gap-1.5">
          <button onClick={handleCreatePr} disabled={prCreating}
            className="px-2 py-1 text-[9px] font-mono rounded border border-crt-green/30 text-crt-green hover:bg-crt-green/10 transition-all">
            {prCreating ? "CREATING..." : "CREATE PR"}
          </button>
          {prError && <span className="text-[9px] font-mono text-crt-red truncate">{prError}</span>}
        </div>
      )}
    </div>
  );
}
