"use client";

import { useState, useRef, useEffect } from "react";
import type { Task } from "./types";
import { PRIORITY_LABEL, countDone } from "./constants";

export interface TaskCardHeaderActions {
  onEdit: () => void;
  onOpenChat?: () => void;
  onShowDetail: () => void;
  onShowExpand: () => void;
  onShowAiUpdate: () => void;
  onMoveTask: () => void;
  onClearSubtasks: () => void;
  onDelete: () => void;
}

interface TaskCardHeaderProps {
  task: Task;
  taskNameMap?: Map<number, string>;
  isBlocked: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  actions: TaskCardHeaderActions;
  hasTaskMasterAction: boolean;
  deleting: boolean;
}

export default function TaskCardHeader({
  task, taskNameMap, isBlocked, expanded, onToggleExpand,
  actions, hasTaskMasterAction, deleting,
}: TaskCardHeaderProps) {
  const [showActionMenu, setShowActionMenu] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const priorityInfo = PRIORITY_LABEL[task.priority] || PRIORITY_LABEL.medium;
  const subtasks = task.subtasks || [];
  const subtaskCounts = subtasks.length > 0 ? countDone(subtasks) : null;

  useEffect(() => {
    if (!showActionMenu) return;
    const handler = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) setShowActionMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showActionMenu]);

  const menuItem = (label: string, onClick: () => void, colorClass: string, opts?: { disabled?: boolean; disabledLabel?: string }) => (
    <button
      onClick={() => { setShowActionMenu(false); onClick(); }}
      className={`w-full text-left px-3 py-1.5 text-[9px] font-mono ${colorClass} hover:bg-crt-gray/30 transition-colors`}
      disabled={opts?.disabled}
    >
      {opts?.disabled && opts.disabledLabel ? opts.disabledLabel : label}
    </button>
  );

  return (
    <>
      <h3 className="text-xs font-medium text-gray-200 mb-1.5 leading-relaxed">{task.title}</h3>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-crt-gray-text text-[10px] font-mono">#{task.id}</span>
          <span className={`text-[9px] font-mono ${priorityInfo.class}`}>{priorityInfo.text}</span>
          {isBlocked && (
            <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-crt-red/15 text-crt-red border border-crt-red/30">
              WAITING FOR {task.blockedBy!.map((id) => {
                const name = taskNameMap?.get(id);
                return name ? `#${id} ${name}` : `#${id}`;
              }).join(" / ")}
            </span>
          )}
          {task.isIndependent && task.status !== "done" && task.status !== "verified" && (
            <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-crt-cyan/10 text-crt-cyan border border-crt-cyan/30">ROOT</span>
          )}
          {subtaskCounts && (
            <button onClick={onToggleExpand} className="text-[8px] font-mono px-1 py-0.5 rounded bg-crt-gray/50 text-crt-gray-text hover:text-gray-200 transition-colors cursor-pointer">
              {expanded ? "\u25BC" : "\u25B6"} {subtaskCounts.done}/{subtaskCounts.total}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {actions.onOpenChat && (
            <button onClick={actions.onOpenChat} className="text-[9px] text-crt-gray-text hover:text-crt-cyan transition-colors font-mono" title="Chat with AI about this task">&#x1F4AC;</button>
          )}
          <button onClick={actions.onEdit} className="text-[9px] text-crt-gray-text hover:text-crt-green transition-colors font-mono" title="Edit task">&#x270E;</button>
          {hasTaskMasterAction && (
            <div className="relative" ref={actionMenuRef}>
              <button onClick={() => setShowActionMenu((v) => !v)} className="text-[11px] text-crt-gray-text hover:text-gray-200 transition-colors font-mono px-0.5" title="Actions">&#x22EF;</button>
              {showActionMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-crt-dark border border-crt-gray/50 rounded shadow-lg min-w-[130px]">
                  {menuItem("DETAIL", actions.onShowDetail, "text-gray-300")}
                  {menuItem("PLAN (CHAT)", () => actions.onOpenChat?.(), "text-crt-cyan")}
                  {menuItem("EXPAND (AUTO)", actions.onShowExpand, "text-crt-cyan")}
                  {menuItem("AI UPDATE", actions.onShowAiUpdate, "text-crt-amber")}
                  {menuItem("MOVE TO TAG", actions.onMoveTask, "text-crt-amber")}
                  {menuItem("CLEAR SUBS", actions.onClearSubtasks, "text-crt-amber")}
                  <div className="border-t border-crt-gray/30" />
                  {menuItem("DELETE", actions.onDelete, "text-crt-red", { disabled: deleting, disabledLabel: "DELETING..." })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
