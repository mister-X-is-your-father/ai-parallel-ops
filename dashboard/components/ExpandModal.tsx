"use client";

import { useState } from "react";
import { expand } from "@/lib/actions/task-master";

interface ExpandModalProps {
  taskId: number;
  taskTitle: string;
  project: string;
  onClose: () => void;
  onDone: () => void;
}

export default function ExpandModal({
  taskId,
  taskTitle,
  project,
  onClose,
  onDone,
}: ExpandModalProps) {
  const [num, setNum] = useState(5);
  const [research, setResearch] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const handleExpand = async () => {
    setRunning(true);
    setError("");
    try {
      const result = await expand({ action: "expand", project, taskId, num, research });
      if (!result.success) throw new Error(result.error);
      onDone();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setRunning(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop" onClick={onClose}>
      <div className="bg-crt-dark border border-crt-cyan/30 rounded-lg w-[95vw] sm:w-full max-w-sm mx-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-crt-gray/30">
          <span className="text-xs font-mono glow-cyan tracking-wider">EXPAND TASK #{taskId}</span>
          <button onClick={onClose} className="text-crt-gray-text hover:text-gray-200 text-sm">&#x2715;</button>
        </div>
        <div className="px-4 py-3 space-y-3">
          <p className="text-[10px] font-mono text-gray-300 line-clamp-2">{taskTitle}</p>
          <div>
            <label className="text-[9px] font-mono text-crt-gray-text tracking-wider block mb-1">SUBTASK COUNT</label>
            <input
              type="range"
              min={2}
              max={10}
              value={num}
              onChange={(e) => setNum(Number(e.target.value))}
              className="w-full accent-crt-cyan"
            />
            <span className="text-[10px] font-mono text-gray-300">{num}</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={research}
              onChange={(e) => setResearch(e.target.checked)}
              className="accent-crt-cyan"
            />
            <span className="text-[10px] font-mono text-gray-300">Research mode</span>
          </label>
          {error && <p className="text-[9px] font-mono text-crt-red">{error}</p>}
          <button
            onClick={handleExpand}
            disabled={running}
            className="btn-execute w-full flex items-center justify-center gap-1.5 px-3 py-1.5"
            style={running ? { opacity: 0.5, cursor: "wait" } : undefined}
          >
            {running ? "EXPANDING..." : "EXPAND"}
          </button>
        </div>
      </div>
    </div>
  );
}
