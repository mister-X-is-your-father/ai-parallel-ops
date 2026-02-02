"use client";

import { useState } from "react";
import { aiAction } from "@/lib/actions/ai";
import { createTask } from "@/lib/actions/tasks";

interface CreateTaskModalProps {
  projects: string[];
  defaultProject?: string;
  onClose: () => void;
  onCreated: (taskId?: number, project?: string) => void;
}

export default function CreateTaskModal({
  projects,
  defaultProject,
  onClose,
  onCreated,
}: CreateTaskModalProps) {
  const [project, setProject] = useState(defaultProject || projects[0] || "");
  const [notes, setNotes] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [contextFilesText, setContextFilesText] = useState("");
  const [refining, setRefining] = useState(false);
  const [refined, setRefined] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleRefine = async () => {
    if (!notes.trim()) return;
    setRefining(true);
    try {
      const result = await aiAction({ action: "refine-task", payload: { notes: notes.trim(), project } });
      if (result.success) {
        const data = result.data as Record<string, unknown>;
        if (data.title) setTitle(data.title as string);
        if (data.description) setDescription(data.description as string);
        if (data.priority) setPriority(data.priority as string);
        if ((data.subtasks as string[])?.length) setSubtasks(data.subtasks as string[]);
        setRefined(true);
      } else throw new Error();
    } catch {
      // fallback: use notes as-is
      setTitle(notes.trim().split("\n")[0].slice(0, 80));
      setDescription(notes.trim());
      setRefined(true);
    }
    setRefining(false);
  };

  const handleSave = async () => {
    if (!title.trim() || !project) return;
    setSaving(true);
    await createTask({
      action: "create", project, title: title.trim(), description: description.trim(),
      priority, subtasks: subtasks.filter((s) => s.trim()),
      contextFiles: contextFilesText.split("\n").map(s => s.trim()).filter(Boolean),
    });
    setSaving(false);
    onCreated();
    onClose();
  };

  const handleSubtaskChange = (idx: number, value: string) => {
    const next = [...subtasks];
    next[idx] = value;
    setSubtasks(next);
  };

  const handleRemoveSubtask = (idx: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== idx));
  };

  const handleAddSubtask = () => {
    setSubtasks([...subtasks, ""]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop" onClick={onClose}>
      <div
        className="bg-crt-dark border border-crt-green/30 rounded-lg w-[95vw] sm:w-full max-w-lg mx-auto max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-crt-gray/30">
          <span className="text-xs font-mono glow-green tracking-wider">NEW TASK</span>
          <button onClick={onClose} className="text-crt-gray-text hover:text-gray-200 text-sm">&#x2715;</button>
        </div>

        <div className="px-4 py-3 space-y-3">
          {/* Project selector */}
          <div>
            <label className="text-[9px] font-mono text-crt-gray-text tracking-wider block mb-1">PROJECT</label>
            <select
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="w-full bg-crt-black border border-crt-gray rounded px-2 py-1.5 text-xs font-mono text-gray-200 focus:border-crt-green/40 focus:outline-none"
            >
              {projects.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Phase 1: Rough notes */}
          {!refined && (
            <>
              <div>
                <label className="text-[9px] font-mono text-crt-gray-text tracking-wider block mb-1">
                  ROUGH NOTES
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                  className="w-full bg-crt-black border border-crt-gray rounded px-2 py-1.5 text-xs font-mono text-gray-300 focus:border-crt-green/40 focus:outline-none resize-y leading-relaxed"
                  placeholder="Write rough notes, bullet points, or a brief description... AI will refine it."
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRefine}
                  disabled={refining || !notes.trim()}
                  className="btn-execute flex items-center gap-1.5 px-3 py-1.5"
                  style={refining || !notes.trim() ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                >
                  {refining ? (
                    <>
                      <span className="inline-block w-3 h-3 border border-crt-green/50 border-t-crt-green rounded-full animate-spin" />
                      <span>REFINING...</span>
                    </>
                  ) : (
                    <>
                      <span>&#x2728;</span>
                      <span>AI REFINE</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setTitle(notes.trim().split("\n")[0].slice(0, 80));
                    setDescription(notes.trim());
                    setRefined(true);
                  }}
                  disabled={refining}
                  className="px-3 py-1.5 text-[10px] font-mono rounded border border-crt-gray text-crt-gray-text hover:border-crt-gray-light transition-all"
                  style={refining ? { opacity: 0.4 } : undefined}
                >
                  SKIP AI
                </button>
              </div>
            </>
          )}

          {/* Phase 2: Structured fields */}
          {refined && (
            <>
              {notes.trim() && (
                <div className="px-2 py-1.5 rounded border border-crt-gray/20 bg-crt-gray/10">
                  <span className="text-[8px] font-mono text-crt-gray-text tracking-wider">ORIGINAL</span>
                  <p className="text-[10px] font-mono text-gray-400 mt-0.5 whitespace-pre-wrap line-clamp-3">{notes.trim()}</p>
                </div>
              )}
              <div>
                <label className="text-[9px] font-mono text-crt-gray-text tracking-wider block mb-1">TITLE</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-crt-black border border-crt-gray rounded px-2 py-1.5 text-xs font-mono text-gray-200 focus:border-crt-green/40 focus:outline-none"
                  placeholder="Task title"
                />
              </div>
              <div>
                <label className="text-[9px] font-mono text-crt-gray-text tracking-wider block mb-1">DESCRIPTION</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full bg-crt-black border border-crt-gray rounded px-2 py-1.5 text-[10px] font-mono text-gray-300 focus:border-crt-green/40 focus:outline-none resize-y leading-relaxed"
                  placeholder="Description"
                />
              </div>
              <div>
                <label className="text-[9px] font-mono text-crt-gray-text tracking-wider block mb-1">PRIORITY</label>
                <div className="flex gap-2">
                  {(["low", "medium", "high"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`px-2 py-1 text-[9px] font-mono rounded border transition-all ${
                        priority === p
                          ? p === "high"
                            ? "border-crt-red/50 bg-crt-red/15 text-crt-red"
                            : p === "medium"
                              ? "border-crt-amber/50 bg-crt-amber/15 text-crt-amber"
                              : "border-crt-blue/50 bg-crt-blue/15 text-crt-blue"
                          : "border-crt-gray text-crt-gray-text hover:border-crt-gray-light"
                      }`}
                    >
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subtasks */}
              <div>
                <label className="text-[9px] font-mono text-crt-gray-text tracking-wider block mb-1">SUBTASKS</label>
                <div className="space-y-1">
                  {subtasks.map((s, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <span className="text-[10px] text-crt-gray-text">&#x25cb;</span>
                      <input
                        value={s}
                        onChange={(e) => handleSubtaskChange(i, e.target.value)}
                        className="flex-1 bg-transparent border-b border-crt-gray/30 text-[10px] font-mono text-gray-300 focus:border-crt-green/40 focus:outline-none px-1 py-0.5"
                      />
                      <button
                        onClick={() => handleRemoveSubtask(i)}
                        className="text-[9px] text-crt-gray-text hover:text-crt-red transition-colors"
                      >
                        &#x2715;
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={handleAddSubtask}
                    className="text-[9px] font-mono text-crt-gray-text/50 hover:text-crt-gray-text transition-colors"
                  >
                    + add subtask
                  </button>
                </div>
              </div>

              {/* Context Files */}
              <div>
                <label className="text-[9px] font-mono text-crt-gray-text tracking-wider block mb-1">CONTEXT FILES</label>
                <textarea
                  value={contextFilesText}
                  onChange={(e) => setContextFilesText(e.target.value)}
                  rows={3}
                  className="w-full bg-crt-black border border-crt-gray rounded px-2 py-1.5 text-[10px] font-mono text-gray-300 focus:border-crt-green/40 focus:outline-none resize-y leading-relaxed"
                  placeholder={"One file path per line:\npath/to/spec.md\nsrc/components/App.tsx"}
                />
              </div>

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => { setRefined(false); }}
                  className="px-2 py-1 text-[9px] font-mono rounded border border-crt-gray text-crt-gray-text hover:border-crt-gray-light transition-all"
                >
                  &#x2190; BACK
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving || !title.trim()}
                    className="btn-execute flex items-center gap-1.5 px-3 py-1.5"
                    style={saving || !title.trim() ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                  >
                    {saving ? "SAVING..." : "CREATE"}
                  </button>
                  <button
                    onClick={async () => {
                      if (!title.trim() || !project) return;
                      setSaving(true);
                      try {
                        const result = await createTask({
                          action: "create", project, title: title.trim(), description: description.trim(),
                          priority, subtasks: subtasks.filter((s) => s.trim()),
                          contextFiles: contextFilesText.split("\n").map(s => s.trim()).filter(Boolean),
                        });
                        if (result.success) {
                          const task = result.data as { id?: number };
                          if (task?.id) { onCreated(task.id, project); onClose(); }
                          else { onCreated(); onClose(); }
                        } else { onCreated(); onClose(); }
                      } catch { onCreated(); onClose(); }
                      setSaving(false);
                    }}
                    disabled={saving || !title.trim()}
                    className="px-3 py-1.5 text-[10px] font-mono rounded border border-crt-cyan/30 text-crt-cyan hover:border-crt-cyan/50 hover:bg-crt-cyan/10 transition-all flex items-center gap-1"
                    style={saving || !title.trim() ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                  >
                    {saving ? "..." : "CREATE + PLAN"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
