"use client";

import { useState, useRef, lazy, Suspense } from "react";
import type { TaskCardProps } from "./types";
import { PRIORITY_CLASS } from "./constants";
import TaskCardEdit from "./TaskCardEdit";
import TaskCardHeader from "./TaskCardHeader";
import TaskCardActions from "./TaskCardActions";
import type { ReviewData } from "./TaskCardActions";
import TaskCardSections from "./TaskCardSections";
import TaskCardPrLink from "./TaskCardPrLink";
import TaskCardReview from "./TaskCardReview";
import TaskCardSuggestions from "./TaskCardSuggestions";
import SubtaskTree from "./SubtaskTree";

const ExpandModal = lazy(() => import("../ExpandModal"));
const TaskDetailModal = lazy(() => import("../TaskDetailModal"));

export default function TaskCard({
  task, project, taskNameMap, allTaskIds,
  onExecute, onStatusChange, onEdit, onSubtaskAction, onOpenChat, onTaskMasterAction,
}: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [expanded, setExpanded] = useState(task.status === "done" || task.status === "review");
  const [newSubtask, setNewSubtask] = useState("");
  const [showExpandModal, setShowExpandModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAiUpdate, setShowAiUpdate] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingDep, setAddingDep] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<{ title: string; description: string }[]>([]);
  const subtaskInputRef = useRef<HTMLInputElement>(null);

  const isBlocked = (task.blockedBy?.length ?? 0) > 0;
  const subtasks = task.subtasks || [];

  const handleMoveTask = async () => {
    if (!onTaskMasterAction) return;
    const toTag = prompt(`Move task #${task.id} to which tag?`);
    if (!toTag) return;
    await onTaskMasterAction(project, task.id, "move-task", { toTag });
  };

  const handleClearSubtasks = async () => {
    if (!onTaskMasterAction) return;
    if (!confirm(`Clear all subtasks of task #${task.id}?`)) return;
    await onTaskMasterAction(project, task.id, "clear-subtasks", { taskIds: String(task.id) });
  };

  const handleDelete = async () => {
    if (!onTaskMasterAction) return;
    if (!confirm(`Delete task #${task.id}?`)) return;
    setDeleting(true);
    await onTaskMasterAction(project, task.id, "delete");
    setDeleting(false);
  };

  const handleAddDep = async (depId: number) => {
    if (!onTaskMasterAction) return;
    await onTaskMasterAction(project, task.id, "add-dependency", { dependsOn: depId });
    setAddingDep(false);
  };

  const handleRemoveDep = async (depId: number) => {
    if (!onTaskMasterAction) return;
    await onTaskMasterAction(project, task.id, "remove-dependency", { dependsOn: depId });
  };

  const handleAddSubtask = (parentSubtaskId?: number) => {
    if (!newSubtask.trim()) return;
    const payload: Record<string, unknown> = { subtaskTitle: newSubtask.trim() };
    if (parentSubtaskId) payload.parentSubtaskId = parentSubtaskId;
    onSubtaskAction(project, task.id, "add", payload);
    setNewSubtask("");
    subtaskInputRef.current?.focus();
  };

  if (isEditing) {
    return (
      <TaskCardEdit
        task={task}
        project={project}
        onSave={(p, id, fields) => { onEdit(p, id, fields); }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  const depthIndent = (task.depth ?? 0) * 12;

  return (
    <div
      className={`card-hover bg-crt-dark rounded px-3 py-2.5 animate-fade-in ${PRIORITY_CLASS[task.priority] || ""}`}
      style={depthIndent > 0 ? { marginLeft: depthIndent, borderLeft: "2px solid rgba(0,255,65,0.15)" } : undefined}
      onDoubleClick={() => setIsEditing(true)}
    >
      <TaskCardHeader
        task={task}
        taskNameMap={taskNameMap}
        isBlocked={isBlocked}
        expanded={expanded}
        onToggleExpand={() => setExpanded(!expanded)}
        actions={{
          onEdit: () => setIsEditing(true),
          onOpenChat: onOpenChat ? () => onOpenChat(task, project) : undefined,
          onShowDetail: () => setShowDetailModal(true),
          onShowExpand: () => setShowExpandModal(true),
          onShowAiUpdate: () => setShowAiUpdate(true),
          onMoveTask: handleMoveTask,
          onClearSubtasks: handleClearSubtasks,
          onDelete: handleDelete,
        }}
        hasTaskMasterAction={!!onTaskMasterAction}
        deleting={deleting}
      />

      <TaskCardSections
        task={task}
        project={project}
        showAiUpdate={showAiUpdate}
        onHideAiUpdate={() => setShowAiUpdate(false)}
        onEdit={(p, id, fields) => onEdit(p, id, fields)}
        onTaskMasterAction={onTaskMasterAction}
      />

      {/* Dependencies */}
      {(task.dependencies.length > 0 || onTaskMasterAction) && (
        <div className="flex flex-wrap items-center gap-1 mb-2">
          <span className="text-[9px] text-crt-gray-text">DEP:</span>
          {task.dependencies.map((d) => (
            <span key={d} className="text-[9px] font-mono text-crt-amber bg-crt-gray px-1 rounded inline-flex items-center gap-0.5"
              title={taskNameMap?.get(d) || `Task #${d}`}>
              #{d}{taskNameMap?.has(d) ? ` ${taskNameMap.get(d)!.length > 20 ? taskNameMap.get(d)!.slice(0, 20) + "…" : taskNameMap.get(d)}` : ""}
              {onTaskMasterAction && (
                <button onClick={() => handleRemoveDep(d)} className="text-[8px] text-crt-red/60 hover:text-crt-red ml-0.5" title="Remove dependency">&#x2715;</button>
              )}
            </span>
          ))}
          {onTaskMasterAction && !addingDep && (
            <button onClick={() => setAddingDep(true)} className="text-[8px] font-mono text-crt-gray-text/50 hover:text-crt-amber transition-colors px-1" title="Add dependency">+</button>
          )}
          {addingDep && (
            <select autoFocus
              onChange={(e) => { if (e.target.value) handleAddDep(Number(e.target.value)); }}
              onBlur={() => setAddingDep(false)}
              className="bg-crt-black border border-crt-gray rounded text-[9px] font-mono text-gray-300 px-1 py-0.5"
              defaultValue="">
              <option value="" disabled>select task...</option>
              {(allTaskIds || []).filter((id) => id !== task.id && !task.dependencies.includes(id)).map((id) => (
                <option key={id} value={id}>#{id} {taskNameMap?.get(id)?.slice(0, 30) || ""}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Subtask tree */}
      {expanded && subtasks.length > 0 && (
        <div className="mb-2 border-t border-crt-gray/30 pt-2 mt-1">
          <SubtaskTree subtasks={subtasks} taskId={task.id} project={project} onSubtaskAction={onSubtaskAction} depth={0} />
          <div className="flex items-center gap-1 mt-1.5">
            <input ref={subtaskInputRef} value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddSubtask(); }}
              placeholder="+ subtask" className="flex-1 bg-transparent border-b border-crt-gray/30 text-[10px] font-mono text-gray-300 focus:border-crt-green/40 focus:outline-none px-0 py-0.5 placeholder:text-crt-gray-text/30" />
          </div>
        </div>
      )}

      {subtasks.length === 0 && !expanded && (
        <button onClick={() => setExpanded(true)} className="text-[8px] font-mono text-crt-gray-text/30 hover:text-crt-gray-text transition-colors mb-2">+ subtask</button>
      )}
      {subtasks.length === 0 && expanded && (
        <div className="mb-2 border-t border-crt-gray/30 pt-2 mt-1">
          <div className="flex items-center gap-1">
            <input ref={subtaskInputRef} value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddSubtask(); }}
              placeholder="+ subtask (Enter to add)" className="flex-1 bg-transparent border-b border-crt-gray/30 text-[10px] font-mono text-gray-300 focus:border-crt-green/40 focus:outline-none px-0 py-0.5 placeholder:text-crt-gray-text/30" autoFocus />
          </div>
        </div>
      )}

      <TaskCardPrLink task={task} project={project} />

      {showSuggestions && (
        <TaskCardSuggestions suggestions={suggestions} project={project}
          onRemove={(i) => setSuggestions((prev) => prev.filter((_, j) => j !== i))} />
      )}

      {showReview && reviewData && (
        <TaskCardReview reviewData={reviewData} branch={task.branch} onClose={() => setShowReview(false)} />
      )}

      <TaskCardActions
        task={task}
        project={project}
        isBlocked={isBlocked}
        onExecute={onExecute}
        onStatusChange={onStatusChange}
        onShowDetail={() => setShowDetailModal(true)}
        onShowReview={(data) => { setReviewData(data); setShowReview(true); }}
        onShowSuggestions={(s) => { setSuggestions(s); setShowSuggestions(true); }}
      />

      {showExpandModal && (
        <Suspense fallback={null}>
          <ExpandModal taskId={task.id} taskTitle={task.title} project={project}
            onClose={() => setShowExpandModal(false)} onDone={() => {}} />
        </Suspense>
      )}
      {showDetailModal && (
        <Suspense fallback={null}>
          <TaskDetailModal taskId={task.id} project={project}
            onClose={() => setShowDetailModal(false)} />
        </Suspense>
      )}
    </div>
  );
}
