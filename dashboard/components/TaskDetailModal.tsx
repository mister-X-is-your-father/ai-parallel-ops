"use client";

import { useState, useEffect } from "react";
import { showTask, aiUpdate } from "@/lib/actions/task-master";
import { updateFields } from "@/lib/actions/tasks";

interface TaskDetail {
  id: number;
  title: string;
  description: string;
  details: string;
  testStrategy: string;
  status: string;
  priority: string;
  dependencies: number[];
  contextFiles?: string[];
  subtasks: unknown[];
  [key: string]: unknown;
}

interface TaskDetailModalProps {
  taskId: number;
  project: string;
  onClose: () => void;
}

const EDITABLE_FIELDS = ["title", "description", "details", "testStrategy"] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];

const FIELD_LABELS: Record<EditableField, string> = {
  title: "TITLE",
  description: "DESCRIPTION",
  details: "DETAILS",
  testStrategy: "TEST STRATEGY",
};

export default function TaskDetailModal({
  taskId,
  project,
  onClose,
}: TaskDetailModalProps) {
  const [data, setData] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [contextFiles, setContextFiles] = useState<string[]>([]);
  const [newFilePath, setNewFilePath] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await showTask({ action: "show", project, taskId });
        if (!res.success) throw new Error(res.error);
        const result = res.data as Record<string, unknown>;
        const task = (result.task || result) as TaskDetail;
        setData(task);
        setContextFiles((task.contextFiles as string[]) || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      }
      setLoading(false);
    })();
  }, [taskId, project]);

  const startEdit = (field: EditableField) => {
    if (!data) return;
    setEditingField(field);
    setEditValue(String(data[field] || ""));
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const saveEdit = async () => {
    if (!data || !editingField) return;
    setSaving(true);
    try {
      if (editingField === "title" || editingField === "description") {
        await updateFields({ project, taskId, [editingField]: editValue });
      } else {
        await aiUpdate({ action: "ai-update", project, taskId, prompt: `Set the ${editingField} to exactly: ${editValue}` });
      }
      setData({ ...data, [editingField]: editValue });
      setEditingField(null);
      setEditValue("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop"
      onClick={onClose}
    >
      <div
        className="bg-crt-dark border border-crt-green/30 rounded-lg w-[95vw] sm:w-full max-w-2xl mx-auto max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-crt-gray/30">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono glow-green tracking-wider">
              TASK #{taskId}
            </span>
            {data && (
              <>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                    data.status === "done"
                      ? "border-crt-cyan/30 text-crt-cyan"
                      : data.status === "in-progress"
                        ? "border-crt-green/30 text-crt-green"
                        : "border-crt-gray/30 text-crt-gray-text"
                  }`}
                >
                  {data.status?.toUpperCase()}
                </span>
                <span
                  className={`text-[9px] font-mono ${
                    data.priority === "high"
                      ? "text-crt-red"
                      : data.priority === "low"
                        ? "text-crt-blue"
                        : "text-crt-amber"
                  }`}
                >
                  {data.priority?.toUpperCase()}
                </span>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-crt-gray-text hover:text-gray-200 text-sm"
          >
            &#x2715;
          </button>
        </div>

        <div className="px-4 py-3 space-y-4">
          {loading && (
            <p className="text-[10px] font-mono text-crt-gray-text">
              Loading...
            </p>
          )}
          {error && (
            <p className="text-[10px] font-mono text-crt-red">{error}</p>
          )}

          {data &&
            EDITABLE_FIELDS.map((field) => {
              const value = String(data[field] || "");
              const isEditing = editingField === field;
              const isMultiline = field !== "title";

              return (
                <div key={field}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[9px] font-mono text-crt-gray-text tracking-wider">
                      {FIELD_LABELS[field]}
                    </label>
                    {!isEditing && (
                      <button
                        onClick={() => startEdit(field)}
                        className="text-[8px] font-mono text-crt-gray-text/50 hover:text-crt-green transition-colors"
                      >
                        EDIT
                      </button>
                    )}
                  </div>
                  {isEditing ? (
                    <div>
                      {isMultiline ? (
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          rows={field === "description" ? 4 : 6}
                          className="w-full bg-crt-black border border-crt-green/30 rounded px-2 py-1.5 text-[10px] font-mono text-gray-300 focus:border-crt-green/50 focus:outline-none resize-y leading-relaxed"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Escape") cancelEdit();
                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                              saveEdit();
                          }}
                        />
                      ) : (
                        <input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full bg-crt-black border border-crt-green/30 rounded px-2 py-1.5 text-[10px] font-mono text-gray-200 focus:border-crt-green/50 focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Escape") cancelEdit();
                            if (e.key === "Enter") saveEdit();
                          }}
                        />
                      )}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <button
                          onClick={cancelEdit}
                          className="px-2 py-0.5 text-[8px] font-mono rounded border border-crt-gray text-crt-gray-text hover:border-crt-gray-light transition-all"
                        >
                          CANCEL
                        </button>
                        <button
                          onClick={saveEdit}
                          disabled={saving}
                          className="px-2 py-0.5 text-[8px] font-mono rounded border border-crt-green/40 bg-crt-green/10 text-crt-green hover:bg-crt-green/20 transition-all"
                          style={saving ? { opacity: 0.5 } : undefined}
                        >
                          {saving ? "SAVING..." : "SAVE"}
                        </button>
                        <span className="text-[7px] font-mono text-crt-gray-text/40">
                          {isMultiline ? "Ctrl+Enter: save / Esc: cancel" : "Enter: save / Esc: cancel"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => startEdit(field)}
                      className="bg-crt-black/30 rounded px-2 py-1.5 text-[10px] font-mono text-gray-300 whitespace-pre-wrap leading-relaxed min-h-[24px] cursor-text hover:bg-crt-black/50 transition-colors"
                    >
                      {value || (
                        <span className="text-crt-gray-text/30 italic">
                          empty — click to edit
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

          {/* Context Files */}
          {data && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[9px] font-mono text-crt-gray-text tracking-wider">
                  CONTEXT FILES ({contextFiles.length})
                </label>
              </div>
              <div className="space-y-1">
                {contextFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 group">
                    <span className="text-[10px] font-mono text-crt-cyan truncate flex-1">{f}</span>
                    <button
                      onClick={async () => {
                        const next = contextFiles.filter((_, idx) => idx !== i);
                        setContextFiles(next);
                        await updateFields({ project, taskId, contextFiles: next });
                      }}
                      className="text-[9px] text-crt-gray-text/40 hover:text-crt-red transition-colors opacity-0 group-hover:opacity-100"
                    >
                      &#x2715;
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-1 mt-1">
                  <input
                    value={newFilePath}
                    onChange={(e) => setNewFilePath(e.target.value)}
                    placeholder="path/to/file.md"
                    className="flex-1 bg-crt-black border border-crt-gray/30 rounded px-2 py-1 text-[10px] font-mono text-gray-300 focus:border-crt-green/40 focus:outline-none"
                    onKeyDown={async (e) => {
                      if (e.key === "Enter" && newFilePath.trim()) {
                        const next = [...contextFiles, newFilePath.trim()];
                        setContextFiles(next);
                        setNewFilePath("");
                        await updateFields({ project, taskId, contextFiles: next });
                      }
                    }}
                  />
                  <button
                    onClick={async () => {
                      if (!newFilePath.trim()) return;
                      const next = [...contextFiles, newFilePath.trim()];
                      setContextFiles(next);
                      setNewFilePath("");
                      await updateFields({ project, taskId, contextFiles: next });
                    }}
                    className="text-[9px] font-mono text-crt-gray-text/50 hover:text-crt-green transition-colors px-1"
                  >
                    + ADD
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Read-only sections */}
          {data && data.dependencies && (data.dependencies as number[]).length > 0 && (
            <div>
              <label className="text-[9px] font-mono text-crt-gray-text tracking-wider block mb-1">
                DEPENDENCIES
              </label>
              <div className="flex flex-wrap gap-1">
                {(data.dependencies as number[]).map((d) => (
                  <span
                    key={d}
                    className="text-[9px] font-mono text-crt-amber bg-crt-gray px-1.5 py-0.5 rounded"
                  >
                    #{d}
                  </span>
                ))}
              </div>
            </div>
          )}

          {data && data.subtasks && (data.subtasks as unknown[]).length > 0 && (
            <div>
              <label className="text-[9px] font-mono text-crt-gray-text tracking-wider block mb-1">
                SUBTASKS ({(data.subtasks as unknown[]).length})
              </label>
              <div className="space-y-0.5">
                {(data.subtasks as { id: number; title: string; status: string }[]).map((s) => (
                  <div key={s.id} className="flex items-center gap-1.5">
                    <span
                      className={`text-[9px] ${
                        s.status === "done" || s.status === "verified"
                          ? "text-crt-cyan"
                          : s.status === "in-progress"
                            ? "glow-green"
                            : "text-crt-gray-text"
                      }`}
                    >
                      {s.status === "done" || s.status === "verified"
                        ? "\u2714"
                        : s.status === "in-progress"
                          ? "\u25ce"
                          : "\u25cb"}
                    </span>
                    <span className="text-[10px] font-mono text-gray-300">
                      {s.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
