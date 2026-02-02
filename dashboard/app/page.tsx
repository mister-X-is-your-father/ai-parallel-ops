"use client";

import { useEffect, useCallback, useMemo } from "react";
import { useTaskWebSocket } from "@/lib/ws-client";
import { useDashboardStore } from "@/lib/stores/dashboard-store";
import { enrichAllProjects } from "@/lib/dependency";
import ProjectSelector from "@/components/ProjectSelector";
import TaskBoard from "@/components/TaskBoard";
import ExecuteModal from "@/components/ExecuteModal";
import CreateTaskModal from "@/components/CreateTaskModal";
import TaskChat from "@/components/TaskChat";

import { interruptTask, executeTask as executeTaskAction } from "@/lib/actions/execute";
import { updateStatus, updateFields, addSubtask as addSubtaskAction, getAllTasks } from "@/lib/actions/tasks";
import * as tmActions from "@/lib/actions/task-master";
import type { Task } from "@/lib/domain/types";

function getWsUrl(): string {
  if (typeof window === "undefined") return "ws://localhost:5571";
  return `ws://${window.location.hostname}:5571`;
}

export default function Home() {
  const { tasks, projects, connected } = useTaskWebSocket(getWsUrl());
  const {
    enabledProjects, collapsedProjects, batchRunningProject, modals,
    toggleProject, setEnabledProjects, toggleCollapse,
    openExecute, openBatch, openCreate, openChat, closeModal,
    setBatchRunning,
  } = useDashboardStore();

  // Initialize enabled projects from localStorage or enable all
  useEffect(() => {
    const allProjects = Object.keys(tasks);
    if (allProjects.length === 0) return;
    const saved = localStorage.getItem("taskops-enabled-projects");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as string[];
        setEnabledProjects(new Set(parsed.filter((p) => allProjects.includes(p))));
        return;
      } catch {}
    }
    setEnabledProjects(new Set(allProjects));
  }, [tasks, setEnabledProjects]);

  // Save enabled projects to localStorage
  useEffect(() => {
    if (enabledProjects.size > 0) {
      localStorage.setItem("taskops-enabled-projects", JSON.stringify([...enabledProjects]));
    }
  }, [enabledProjects]);

  const handleToggle = useCallback((project: string, enabled: boolean) => {
    // toggleProject just toggles; for explicit set we need the store action
    if (enabled !== enabledProjects.has(project)) toggleProject(project);
  }, [enabledProjects, toggleProject]);

  const handleStatusChange = useCallback(
    async (project: string, taskId: number, status: string) => {
      if (status === "paused" || status === "pending") {
        await interruptTask(project, taskId).catch(() => {});
      }
      await updateStatus({ project, taskId, status });
    },
    []
  );

  const handleEdit = useCallback(
    async (project: string, taskId: number, fields: { title?: string; description?: string }) => {
      await updateFields({ project, taskId, ...fields });
    },
    []
  );

  const handleModalExecute = useCallback(
    async (pane: string, mode: "auto" | "manual", session?: "new" | "resume" | "continue", branchAction?: "stay" | "checkout" | "create", branchName?: string, baseBranch?: string) => {
      if (!modals.execute) return;
      await executeTaskAction({
        project: modals.execute.project,
        taskId: modals.execute.task.id,
        taskTitle: modals.execute.task.title,
        taskDescription: modals.execute.task.description,
        contextFiles: modals.execute.task.contextFiles || [],
        pane, mode, session, branchAction, branchName, baseBranch,
      });
      closeModal("execute");
    },
    [modals.execute, closeModal]
  );

  const handleSubtaskAction = useCallback(
    async (project: string, taskId: number, action: string, payload: Record<string, unknown>) => {
      if (action === "add") {
        await addSubtaskAction({ project, taskId, subtaskAction: "add", subtaskTitle: payload.subtaskTitle as string });
      } else {
        const { updateSubtaskStatus, deleteSubtask } = await import("@/lib/actions/tasks");
        if (action === "updateStatus") {
          await updateSubtaskStatus({ project, taskId, subtaskAction: "updateStatus", ...payload });
        } else if (action === "delete") {
          await deleteSubtask({ project, taskId, subtaskAction: "delete", ...payload });
        } else if (action === "ai-update-subtask") {
          await tmActions.aiUpdateSubtask({ action: "ai-update-subtask", project, subtaskId: payload.subtaskId as string, prompt: payload.prompt as string });
        }
      }
    },
    []
  );

  const handleApplyChatAction = useCallback(
    async (project: string, taskId: number, action: { type: string; title?: string; value?: string }) => {
      if (action.type === "add-subtask" && action.title) {
        await addSubtaskAction({ project, taskId, subtaskAction: "add", subtaskTitle: action.title });
      } else if (action.type === "update-description" && action.value) {
        await updateFields({ project, taskId, description: action.value });
      } else if (action.type === "update-title" && action.value) {
        await updateFields({ project, taskId, title: action.value });
      }
    },
    []
  );

  const handleTaskMasterAction = useCallback(
    async (project: string, taskId: number, action: string, params?: Record<string, unknown>) => {
      const actionMap: Record<string, (input: unknown) => Promise<unknown>> = {
        "expand": tmActions.expand, "ai-update": tmActions.aiUpdate,
        "ai-update-subtask": tmActions.aiUpdateSubtask, "ai-create": tmActions.aiCreate,
        "research": tmActions.research, "complexity": tmActions.complexity,
        "parse-prd": tmActions.parsePrd, "next": tmActions.nextTask,
        "show": tmActions.showTask, "add-dependency": tmActions.addDependency,
        "remove-dependency": tmActions.removeDependency, "delete": tmActions.tmDeleteTask,
        "move-task": tmActions.moveTask, "clear-subtasks": tmActions.clearSubtasks,
        "expand-all": tmActions.expandAll, "update-bulk": tmActions.updateBulk,
        "complexity-report": tmActions.complexityReport,
        "validate-deps": tmActions.validateDeps, "fix-deps": tmActions.fixDeps,
        "create-tag": tmActions.createTag, "delete-tag": tmActions.deleteTag,
        "list-tags": tmActions.listTags, "use-tag": tmActions.useTag,
        "rename-tag": tmActions.renameTag, "copy-tag": tmActions.copyTag,
        "initialize-project": tmActions.initializeProject, "models": tmActions.getModels,
      };
      const fn = actionMap[action];
      if (fn) await fn({ action, project, taskId, ...params });
    },
    []
  );

  const handleBatchModalExecute = useCallback(
    async (pane: string, mode: "auto" | "manual", session?: "new" | "resume" | "continue") => {
      if (!modals.batch) return;
      const { tasks: batchTasks, project } = modals.batch;
      closeModal("batch");
      setBatchRunning(project);
      for (const task of batchTasks) {
        await executeTaskAction({
          project, taskId: task.id, taskTitle: task.title,
          taskDescription: task.description, pane, mode, session,
        });
      }
      setBatchRunning(null);
    },
    [modals.batch, closeModal, setBatchRunning]
  );

  const taskData = useMemo(
    () => enrichAllProjects(tasks as Record<string, { tasks: Task[]; metadata: Record<string, unknown> }>),
    [tasks]
  );

  const stats = { total: 0, active: 0, done: 0, pending: 0, projects: 0 };
  for (const [proj, data] of Object.entries(taskData)) {
    if (!enabledProjects.has(proj) || !data?.tasks) continue;
    stats.projects++;
    for (const t of data.tasks) {
      stats.total++;
      if (t.status === "in-progress") stats.active++;
      else if (t.status === "done") stats.done++;
      else if (t.status === "pending") stats.pending++;
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <ProjectSelector
        projects={projects}
        hubProjects={Object.keys(tasks)}
        onToggle={handleToggle}
        onProjectsChanged={() => window.location.reload()}
        enabledProjects={enabledProjects}
      />

      <div className="px-3 sm:px-6 py-1.5 border-b border-crt-gray bg-crt-black/50 flex items-center flex-wrap gap-3 sm:gap-6 text-[10px] font-mono">
        <div className="flex items-center gap-1.5">
          <span className="text-crt-gray-text">CONN:</span>
          <span className={connected ? "glow-green" : "glow-red"}>{connected ? "ONLINE" : "OFFLINE"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-crt-gray-text">BOARDS:</span>
          <span className="text-gray-300">{stats.projects}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-crt-gray-text">TASKS:</span>
          <span className="text-gray-300">{stats.total}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-crt-gray-text">RUNNING:</span>
          <span className="glow-green">{stats.active}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-crt-gray-text">TODO:</span>
          <span className="text-crt-amber">{stats.pending}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-crt-gray-text">CHECK:</span>
          <span className="glow-cyan">{stats.done}</span>
        </div>
      </div>

      <TaskBoard
        tasks={taskData}
        projectDirs={projects}
        enabledProjects={enabledProjects}
        collapsedProjects={collapsedProjects}
        onToggleCollapse={toggleCollapse}
        onExecute={(task: Task, project: string) => openExecute(task, project)}
        onBatchExecute={(batchTasks: Task[], project: string) => openBatch(batchTasks, project)}
        batchRunningProject={batchRunningProject}
        onStatusChange={handleStatusChange}
        onEdit={handleEdit}
        onSubtaskAction={handleSubtaskAction}
        onCreateTask={(project: string) => openCreate(project)}
        onOpenChat={(task: Task, project: string) => openChat(task, project)}
        onTaskMasterAction={handleTaskMasterAction}
      />

      {modals.execute && (
        <ExecuteModal
          task={modals.execute.task}
          project={modals.execute.project}
          onClose={() => closeModal("execute")}
          onExecute={handleModalExecute}
        />
      )}

      {modals.batch && (
        <ExecuteModal
          task={{ id: 0, title: `RUN ALL (${modals.batch.tasks.length} tasks)`, description: modals.batch.tasks.map(t => `#${t.id} ${t.title}`).join("\n"), status: "pending", priority: "medium", dependencies: [], subtasks: [] }}
          project={modals.batch.project}
          onClose={() => closeModal("batch")}
          onExecute={handleBatchModalExecute}
        />
      )}

      {modals.create && (
        <CreateTaskModal
          projects={[...enabledProjects]}
          defaultProject={modals.create}
          onClose={() => closeModal("create")}
          onCreated={(taskId?: number, proj?: string) => {
            if (taskId && proj) {
              const projectTasks = taskData[proj]?.tasks || [];
              const found = projectTasks.find((t: Task) => t.id === taskId);
              if (found) {
                openChat(found, proj, "breakdown");
              } else {
                getAllTasks().then(data => {
                  const d = data as Record<string, { tasks: Task[] }>;
                  const t = d[proj]?.tasks?.find((t: Task) => t.id === taskId);
                  if (t) openChat(t, proj, "breakdown");
                });
              }
            }
          }}
        />
      )}

      {modals.chat && (
        <TaskChat
          task={modals.chat.task}
          project={modals.chat.project}
          mode={modals.chat.mode || "chat"}
          onClose={() => closeModal("chat")}
          onApplyAction={handleApplyChatAction}
        />
      )}
    </div>
  );
}
