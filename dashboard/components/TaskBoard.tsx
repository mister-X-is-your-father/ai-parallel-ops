"use client";

import { useState, lazy, Suspense } from "react";
import TaskCard from "./task-card";
import * as tmActions from "@/lib/actions/task-master";
import type { Task } from "@/lib/domain/types";
import { classifyTask, applyFilter } from "@/lib/domain/task-classifier";
import TagManagerPanel from "./TagManagerPanel";
import DependencyPipeline from "./DependencyPipeline";
import CollapsibleSection from "./CollapsibleSection";
import { ResultPanel, ResearchPanel, PrdImportPanel, BulkUpdatePanel, SuggestionsPanel } from "./ProjectBoardPanels";

const DependencyGraph = lazy(() => import("./DependencyGraph"));

type FilterMode = "all" | "independent" | "dependent" | "waiting";
type LayoutMode = "flat" | "split";

interface ProjectBoardProps {
  projectName: string;
  projectDir?: string;
  tasks: Task[];
  onExecute: (task: Task, project: string) => void;
  onBatchExecute: (tasks: Task[], project: string) => void;
  batchRunning?: boolean;
  onStatusChange: (project: string, taskId: number, status: string) => void;
  onEdit: (project: string, taskId: number, fields: { title?: string; description?: string }) => void;
  onSubtaskAction: (project: string, taskId: number, action: string, payload: Record<string, unknown>) => void;
  onCreateTask: (project: string) => void;
  onOpenChat: (task: Task, project: string) => void;
  onTaskMasterAction: (project: string, taskId: number, action: string, params?: Record<string, unknown>) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const MAIN_COLUMNS = [
  { key: "pending", label: "TODO", icon: "\u25cb", colorClass: "text-crt-gray-text" },
  { key: "in-progress", label: "RUNNING", icon: "\u25ce", colorClass: "glow-green" },
  { key: "done", label: "CHECK", icon: "\u25c9", colorClass: "glow-cyan" },
];

const BOTTOM_SECTIONS = [
  { key: "waiting", label: "WAITING", icon: "\u29d6", colorClass: "glow-red" },
  { key: "verified", label: "COMPLETE", icon: "\u25c8", colorClass: "glow-blue" },
  { key: "deferred", label: "DEFERRED", icon: "\u2014", colorClass: "text-crt-gray-text" },
];

const ALL_COLUMNS = [
  { key: "pending", label: "TODO", icon: "\u25cb", colorClass: "text-crt-gray-text" },
  { key: "in-progress", label: "RUNNING", icon: "\u25ce", colorClass: "glow-green" },
  { key: "done", label: "CHECK", icon: "\u25c9", colorClass: "glow-cyan" },
  { key: "verified", label: "COMPLETE", icon: "\u25c8", colorClass: "glow-blue" },
  { key: "waiting", label: "WAITING", icon: "\u29d6", colorClass: "glow-red" },
  { key: "deferred", label: "DEFERRED", icon: "\u2014", colorClass: "text-crt-gray-text" },
];

const FILTERS: { key: FilterMode; label: string }[] = [
  { key: "all", label: "ALL" },
  { key: "independent", label: "INDEPENDENT" },
  { key: "dependent", label: "DEPENDENT" },
  { key: "waiting", label: "WAITING" },
];

const LAYOUTS: { key: LayoutMode; label: string }[] = [
  { key: "flat", label: "FLAT" },
  { key: "split", label: "SPLIT" },
];

type PanelType = "research" | "prd" | "bulk" | "suggestions" | "tags" | null;

function ProjectBoard({
  projectName, projectDir, tasks,
  onExecute, onBatchExecute, batchRunning,
  onStatusChange, onEdit, onCreateTask, onOpenChat, onSubtaskAction, onTaskMasterAction,
  collapsed, onToggleCollapse,
}: ProjectBoardProps) {
  // Layout state (3)
  const [filter, setFilter] = useState<FilterMode>("all");
  const [layout, setLayout] = useState<LayoutMode>("split");
  const [showGraph, setShowGraph] = useState(false);

  // Active panel (1 — replaces 6+ show* booleans)
  const [activePanel, setActivePanel] = useState<PanelType>(null);

  // Result panels (5 — dismissible)
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [nextResult, setNextResult] = useState<string | null>(null);
  const [validateResult, setValidateResult] = useState<string | null>(null);
  const [reportResult, setReportResult] = useState<string | null>(null);
  const [modelsResult, setModelsResult] = useState<string | null>(null);

  // Operation loading (3)
  const [expandingAll, setExpandingAll] = useState(false);
  const [validating, setValidating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [initializing, setInitializing] = useState(false);

  const togglePanel = (p: PanelType) => setActivePanel(v => v === p ? null : p);

  const handleAnalyze = async () => {
    setAnalyzing(true); setAnalysisResult(null);
    try {
      const r = await tmActions.complexity({ action: "complexity", project: projectName });
      setAnalysisResult(r.success ? JSON.stringify(r.data, null, 2) : r.error);
    } catch (e: unknown) { setAnalysisResult(e instanceof Error ? e.message : String(e)); }
    setAnalyzing(false);
  };

  const handleNext = async () => {
    setNextResult(null);
    try {
      const r = await tmActions.nextTask({ action: "next", project: projectName });
      setNextResult(r.success ? JSON.stringify(r.data, null, 2) : r.error);
    } catch (e: unknown) { setNextResult(e instanceof Error ? e.message : String(e)); }
  };

  const handleExpandAll = async () => {
    setExpandingAll(true);
    try { await tmActions.expandAll({ action: "expand-all", project: projectName }); }
    catch {}
    setExpandingAll(false);
  };

  const handleValidate = async () => {
    setValidating(true); setValidateResult(null);
    try {
      const r = await tmActions.validateDeps({ action: "validate-deps", project: projectName });
      setValidateResult(r.success ? JSON.stringify(r.data, null, 2) : r.error);
    } catch (e: unknown) { setValidateResult(e instanceof Error ? e.message : String(e)); }
    setValidating(false);
  };

  const handleFixDeps = async () => {
    try {
      const r = await tmActions.fixDeps({ action: "fix-deps", project: projectName });
      setValidateResult(r.success ? `Fixed: ${JSON.stringify(r.data)}` : r.error);
    } catch (e: unknown) { setValidateResult(e instanceof Error ? e.message : String(e)); }
  };

  const handleReport = async () => {
    setReportResult(null);
    try {
      const r = await tmActions.complexityReport({ action: "complexity-report", project: projectName });
      setReportResult(r.success ? JSON.stringify(r.data, null, 2) : r.error);
    } catch (e: unknown) { setReportResult(e instanceof Error ? e.message : String(e)); }
  };

  const handleInitialize = async () => {
    if (!confirm(`Initialize task-master project for ${projectName}?`)) return;
    setInitializing(true);
    try {
      const r = await tmActions.initializeProject({ action: "initialize-project", project: projectName });
      if (!r.success) alert(r.error);
    } catch (e: unknown) { alert(e instanceof Error ? e.message : String(e)); }
    setInitializing(false);
  };

  const handleModels = async () => {
    setModelsResult(null);
    try {
      const r = await tmActions.getModels({ action: "models", project: projectName });
      setModelsResult(r.success ? JSON.stringify(r.data, null, 2) : r.error);
    } catch (e: unknown) { setModelsResult(e instanceof Error ? e.message : String(e)); }
  };

  const allTaskIds = tasks.map((t) => t.id);
  const taskNameMap = new Map(tasks.map((t) => [t.id, t.title]));
  const filteredTasks = applyFilter(tasks, filter);

  const getColumnTasks = (colKey: string) =>
    filteredTasks
      .filter((t) => classifyTask(t) === colKey)
      .sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0) || a.id - b.id);

  const stats = {
    total: tasks.length,
    active: tasks.filter((t) => t.status === "in-progress" || t.status === "paused").length,
    pending: tasks.filter((t) => t.status === "pending").length,
    done: tasks.filter((t) => t.status === "done").length,
    verified: tasks.filter((t) => t.status === "verified").length,
    waiting: tasks.filter((t) => (t.blockedBy?.length ?? 0) > 0 && t.status !== "done" && t.status !== "verified").length,
  };

  const cardProps = { projectName, taskNameMap, allTaskIds, onExecute, onStatusChange, onEdit, onSubtaskAction, onOpenChat, onTaskMasterAction };

  const toolbarBtn = (label: string, onClick: () => void, opts?: { active?: boolean; loading?: boolean; disabled?: boolean; colorClass?: string }) => (
    <button
      onClick={onClick}
      disabled={opts?.disabled || opts?.loading}
      className={`px-2 py-0.5 text-[9px] font-mono rounded border transition-all ${
        opts?.active
          ? `${opts.colorClass || "border-crt-cyan/50 bg-crt-cyan/15 text-crt-cyan"}`
          : "border-crt-gray/30 text-crt-gray-text hover:border-crt-gray hover:text-gray-300"
      }`}
      style={opts?.loading ? { opacity: 0.5, cursor: "wait" } : undefined}
    >
      {opts?.loading ? "..." : label}
    </button>
  );

  return (
    <div className="border border-crt-gray rounded bg-crt-black/30 overflow-hidden animate-fade-in">
      {/* Project header */}
      <div
        onClick={onToggleCollapse}
        className="w-full px-4 py-2 flex items-center justify-between bg-crt-dark/80 border-b border-crt-gray hover:bg-crt-gray/30 transition-colors cursor-pointer"
        role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onToggleCollapse(); }}
      >
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-crt-gray-text font-mono">{collapsed ? "\u25B6" : "\u25BC"}</span>
          <div className="w-1.5 h-1.5 rounded-full bg-crt-green shadow-[0_0_4px_rgba(0,255,65,0.5)]" />
          <div className="flex flex-col items-start">
            <span className="font-display text-xs glow-green tracking-widest uppercase">{projectName}</span>
            {projectDir && <span className="text-[9px] text-crt-gray-text font-mono">{projectDir}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap text-[9px] font-mono">
          <span className="text-crt-gray-text">{stats.total} tasks</span>
          {stats.active > 0 && <span className="glow-green">{stats.active} running</span>}
          {stats.pending > 0 && <span className="text-crt-amber">{stats.pending} todo</span>}
          {stats.waiting > 0 && <span className="glow-red">{stats.waiting} waiting</span>}
          {stats.done > 0 && <span className="glow-cyan">{stats.done} check</span>}
          {stats.verified > 0 && <span className="glow-blue">{stats.verified} verified</span>}
          <button
            onClick={(e) => { e.stopPropagation(); onCreateTask(projectName); }}
            className="px-1.5 py-0.5 rounded border border-crt-green/30 bg-crt-green/10 text-crt-green hover:bg-crt-green/20 transition-all"
          >+ NEW</button>
        </div>
      </div>

      {/* Toolbar */}
      {!collapsed && (
        <div className="px-2 sm:px-4 py-1.5 border-b border-crt-gray/50 flex items-center justify-between flex-wrap gap-1 bg-crt-dark/40">
          <div className="flex items-center gap-1 flex-wrap">
            {FILTERS.map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-2 py-0.5 text-[9px] font-mono rounded border transition-all ${
                  filter === f.key ? "border-crt-green/50 bg-crt-green/15 text-crt-green" : "border-crt-gray/30 text-crt-gray-text hover:border-crt-gray hover:text-gray-300"
                }`}>{f.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {LAYOUTS.map((l) => (
              <button key={l.key} onClick={() => setLayout(l.key)}
                className={`px-2 py-0.5 text-[9px] font-mono rounded border transition-all ${
                  layout === l.key && !showGraph ? "border-crt-cyan/50 bg-crt-cyan/15 text-crt-cyan" : "border-crt-gray/30 text-crt-gray-text hover:border-crt-gray hover:text-gray-300"
                }`}>{l.label}</button>
            ))}
            {toolbarBtn("GRAPH", () => setShowGraph(v => !v), { active: showGraph, colorClass: "border-crt-amber/50 bg-crt-amber/15 text-crt-amber" })}
            {toolbarBtn("AI SUGGEST", () => togglePanel("suggestions"), { active: activePanel === "suggestions", colorClass: "border-crt-amber/50 bg-crt-amber/15 text-crt-amber" })}
            {toolbarBtn("ANALYZE", handleAnalyze, { loading: analyzing })}
            {toolbarBtn("NEXT", handleNext)}
            {toolbarBtn("RESEARCH", () => togglePanel("research"), { active: activePanel === "research", colorClass: "border-crt-cyan/50 bg-crt-cyan/15 text-crt-cyan" })}
            {toolbarBtn("IMPORT PRD", () => togglePanel("prd"), { active: activePanel === "prd", colorClass: "border-crt-green/50 bg-crt-green/15 text-crt-green" })}
            {toolbarBtn("EXPAND ALL", handleExpandAll, { loading: expandingAll })}
            {toolbarBtn("VALIDATE", handleValidate, { loading: validating })}
            {toolbarBtn("FIX DEPS", handleFixDeps)}
            {toolbarBtn("REPORT", handleReport)}
            {toolbarBtn("BULK UPDATE", () => togglePanel("bulk"), { active: activePanel === "bulk", colorClass: "border-crt-amber/50 bg-crt-amber/15 text-crt-amber" })}
            <div className="relative">
              {toolbarBtn("TAGS", () => togglePanel("tags"), { active: activePanel === "tags", colorClass: "border-crt-cyan/50 bg-crt-cyan/15 text-crt-cyan" })}
              {activePanel === "tags" && <TagManagerPanel project={projectName} onClose={() => setActivePanel(null)} />}
            </div>
            {toolbarBtn("INIT", handleInitialize, { loading: initializing })}
            {toolbarBtn("MODELS", handleModels)}
          </div>
        </div>
      )}

      {/* Panels — each owns its own state */}
      {!collapsed && activePanel === "suggestions" && (
        <SuggestionsPanel project={projectName} tasks={tasks} taskNameMap={taskNameMap} onClose={() => setActivePanel(null)} />
      )}
      {!collapsed && activePanel === "research" && (
        <ResearchPanel project={projectName} onClose={() => setActivePanel(null)} />
      )}
      {!collapsed && activePanel === "prd" && (
        <PrdImportPanel project={projectName} onClose={() => setActivePanel(null)} />
      )}
      {!collapsed && activePanel === "bulk" && (
        <BulkUpdatePanel project={projectName} onClose={() => setActivePanel(null)} />
      )}

      {/* Result panels */}
      {!collapsed && analysisResult && (
        <ResultPanel title="COMPLEXITY ANALYSIS" result={analysisResult} colorClass="bg-crt-cyan/5 text-crt-cyan" onClose={() => setAnalysisResult(null)} />
      )}
      {!collapsed && nextResult && (
        <ResultPanel title="NEXT TASK" result={nextResult} colorClass="bg-crt-green/5 text-crt-green" onClose={() => setNextResult(null)} />
      )}
      {!collapsed && validateResult && (
        <ResultPanel title="DEPENDENCY VALIDATION" result={validateResult} colorClass="bg-crt-cyan/5 text-crt-cyan" onClose={() => setValidateResult(null)} />
      )}
      {!collapsed && reportResult && (
        <ResultPanel title="COMPLEXITY REPORT" result={reportResult} colorClass="bg-crt-amber/5 text-crt-amber" onClose={() => setReportResult(null)} />
      )}
      {!collapsed && modelsResult && (
        <ResultPanel title="MODEL CONFIGURATION" result={modelsResult} colorClass="bg-crt-cyan/5 text-crt-cyan" onClose={() => setModelsResult(null)} />
      )}

      {/* Dependency Graph */}
      {!collapsed && showGraph && (
        <div className="border-b border-crt-gray/50">
          <Suspense fallback={<div className="h-[300px] flex items-center justify-center text-[10px] text-crt-gray-text font-mono">Loading graph...</div>}>
            <DependencyGraph tasks={tasks} />
          </Suspense>
        </div>
      )}

      {/* Pipeline view for DEPENDENT filter */}
      {!collapsed && !showGraph && filter === "dependent" && (
        <DependencyPipeline tasks={filteredTasks} {...cardProps} />
      )}

      {/* FLAT layout */}
      {!collapsed && !showGraph && filter !== "dependent" && layout === "flat" && (
        <div className="grid grid-cols-6 divide-x divide-crt-gray min-h-[120px] overflow-x-auto">
          {ALL_COLUMNS.map((col) => {
            const colTasks = getColumnTasks(col.key);
            const isTodoCol = col.key === "pending";
            const runnableTodos = isTodoCol ? colTasks.filter((t) => (t.blockedBy?.length ?? 0) === 0) : [];
            return (
              <div key={col.key} className={`flex flex-col min-h-0 ${isTodoCol && batchRunning ? "batch-running" : ""}`}>
                <div className="px-3 py-1.5 border-b border-crt-gray/50 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] ${col.colorClass}`}>{col.icon}</span>
                    <span className={`font-display text-[9px] tracking-widest ${col.colorClass}`}>{col.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isTodoCol && runnableTodos.length > 0 && !batchRunning && (
                      <button onClick={() => onBatchExecute(runnableTodos, projectName)}
                        className="text-[8px] font-mono px-1.5 py-0.5 rounded border border-crt-amber/40 bg-crt-amber/10 text-crt-amber hover:bg-crt-amber/25 transition-all"
                        title="Execute all TODO tasks sequentially">RUN ALL</button>
                    )}
                    {isTodoCol && batchRunning && <span className="text-[8px] font-mono px-1.5 py-0.5 text-crt-amber">RUNNING...</span>}
                    <span className="text-[9px] font-mono text-crt-gray-text bg-crt-gray px-1 rounded">{colTasks.length}</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {colTasks.map((task) => (
                    <TaskCard key={task.id} task={task} project={projectName}
                      taskNameMap={taskNameMap} allTaskIds={allTaskIds}
                      onExecute={onExecute} onStatusChange={onStatusChange}
                      onEdit={onEdit} onSubtaskAction={onSubtaskAction}
                      onOpenChat={onOpenChat} onTaskMasterAction={onTaskMasterAction} />
                  ))}
                  {colTasks.length === 0 && <div className="text-center py-4 text-[9px] text-crt-gray-text/30 font-mono">—</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SPLIT layout */}
      {!collapsed && !showGraph && filter !== "dependent" && layout === "split" && (
        <>
          <div className="grid grid-cols-3 divide-x divide-crt-gray min-h-[120px] overflow-x-auto">
            {MAIN_COLUMNS.map((col) => {
              const colTasks = getColumnTasks(col.key);
              const isTodoCol = col.key === "pending";
              const runnableTodos = isTodoCol ? colTasks.filter((t) => (t.blockedBy?.length ?? 0) === 0) : [];
              return (
                <div key={col.key} className={`flex flex-col min-h-0 ${isTodoCol && batchRunning ? "batch-running" : ""}`}>
                  <div className="px-3 py-1.5 border-b border-crt-gray/50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] ${col.colorClass}`}>{col.icon}</span>
                      <span className={`font-display text-[9px] tracking-widest ${col.colorClass}`}>{col.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isTodoCol && runnableTodos.length > 0 && !batchRunning && (
                        <button onClick={() => onBatchExecute(runnableTodos, projectName)}
                          className="text-[8px] font-mono px-1.5 py-0.5 rounded border border-crt-amber/40 bg-crt-amber/10 text-crt-amber hover:bg-crt-amber/25 transition-all"
                          title="Execute all TODO tasks sequentially">RUN ALL</button>
                      )}
                      {isTodoCol && batchRunning && <span className="text-[8px] font-mono px-1.5 py-0.5 text-crt-amber">RUNNING...</span>}
                      <span className="text-[9px] font-mono text-crt-gray-text bg-crt-gray px-1 rounded">{colTasks.length}</span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                    {colTasks.map((task) => (
                      <TaskCard key={task.id} task={task} project={projectName}
                        taskNameMap={taskNameMap}
                        onExecute={onExecute} onStatusChange={onStatusChange}
                        onEdit={onEdit} onSubtaskAction={onSubtaskAction}
                        onOpenChat={onOpenChat} />
                    ))}
                    {colTasks.length === 0 && <div className="text-center py-4 text-[9px] text-crt-gray-text/30 font-mono">—</div>}
                  </div>
                </div>
              );
            })}
          </div>
          {BOTTOM_SECTIONS.map((sec) => (
            <CollapsibleSection key={sec.key} label={sec.label} icon={sec.icon} colorClass={sec.colorClass}
              tasks={getColumnTasks(sec.key)} {...cardProps} />
          ))}
        </>
      )}
    </div>
  );
}

// --- Main TaskBoard ---

interface TaskBoardProps {
  tasks: Record<string, { tasks: Task[]; metadata: Record<string, unknown> }>;
  projectDirs: Record<string, string>;
  enabledProjects: Set<string>;
  collapsedProjects: Set<string>;
  onToggleCollapse: (project: string) => void;
  onExecute: (task: Task, project: string) => void;
  onBatchExecute: (tasks: Task[], project: string) => void;
  batchRunningProject?: string | null;
  onStatusChange: (project: string, taskId: number, status: string) => void;
  onEdit: (project: string, taskId: number, fields: { title?: string; description?: string }) => void;
  onSubtaskAction: (project: string, taskId: number, action: string, payload: Record<string, unknown>) => void;
  onCreateTask: (project: string) => void;
  onOpenChat: (task: Task, project: string) => void;
  onTaskMasterAction: (project: string, taskId: number, action: string, params?: Record<string, unknown>) => void;
}

export default function TaskBoard({
  tasks, projectDirs, enabledProjects, collapsedProjects, onToggleCollapse,
  onExecute, onBatchExecute, batchRunningProject,
  onStatusChange, onEdit, onSubtaskAction, onCreateTask, onOpenChat, onTaskMasterAction,
}: TaskBoardProps) {
  const enabledEntries = Object.entries(tasks).filter(([name]) => enabledProjects.has(name));

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {enabledEntries.map(([name, data]) => (
        <ProjectBoard key={name} projectName={name} projectDir={projectDirs[name]}
          tasks={data?.tasks || []}
          onExecute={onExecute} onBatchExecute={onBatchExecute}
          batchRunning={batchRunningProject === name}
          onStatusChange={onStatusChange} onEdit={onEdit} onSubtaskAction={onSubtaskAction}
          onCreateTask={onCreateTask} onOpenChat={onOpenChat} onTaskMasterAction={onTaskMasterAction}
          collapsed={collapsedProjects.has(name)} onToggleCollapse={() => onToggleCollapse(name)} />
      ))}
      {enabledEntries.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-crt-gray-text/30 font-display text-sm tracking-widest mb-2">NO PROJECTS ACTIVE</div>
            <div className="text-[10px] text-crt-gray-text/20 font-mono">Enable projects from the header toggles</div>
          </div>
        </div>
      )}
    </div>
  );
}
