"use client";

import { useState, useRef, useEffect } from "react";
import type { Task } from "./types";
import { PRIORITY_CLASS } from "./constants";

interface TaskCardEditProps {
  task: Task;
  project: string;
  onSave: (project: string, taskId: number, fields: { title?: string; description?: string }) => void;
  onCancel: () => void;
}

export default function TaskCardEdit({ task, project, onSave, onCancel }: TaskCardEditProps) {
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDesc, setEditDesc] = useState(task.description);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  const handleSave = () => {
    const changed: { title?: string; description?: string } = {};
    if (editTitle.trim() !== task.title) changed.title = editTitle.trim();
    if (editDesc.trim() !== task.description) changed.description = editDesc.trim();
    if (Object.keys(changed).length > 0) onSave(project, task.id, changed);
    onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSave(); }
    if (e.key === "Escape") onCancel();
  };

  return (
    <div className={`bg-crt-dark rounded px-3 py-2.5 animate-fade-in border border-crt-green/30 ${PRIORITY_CLASS[task.priority] || ""}`} onKeyDown={handleKeyDown}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-crt-gray-text text-[10px] font-mono">#{task.id} EDIT</span>
        <span className="text-[9px] text-crt-gray-text font-mono">Ctrl+Enter: save / Esc: cancel</span>
      </div>
      <input ref={titleRef} value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
        className="w-full bg-crt-black border border-crt-gray rounded px-2 py-1.5 text-xs font-mono text-gray-200 focus:border-crt-green/40 focus:outline-none mb-2" placeholder="Title" />
      <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3}
        className="w-full bg-crt-black border border-crt-gray rounded px-2 py-1.5 text-[10px] font-mono text-gray-300 focus:border-crt-green/40 focus:outline-none resize-y mb-2 leading-relaxed" placeholder="Description" />
      <div className="flex justify-end gap-1.5">
        <button onClick={onCancel} className="px-2 py-1 text-[9px] font-mono rounded border border-crt-gray text-crt-gray-text hover:border-crt-gray-light transition-all">CANCEL</button>
        <button onClick={handleSave} className="px-2 py-1 text-[9px] font-mono rounded border border-crt-green/40 bg-crt-green/10 text-crt-green hover:bg-crt-green/20 transition-all">SAVE</button>
      </div>
    </div>
  );
}
