declare module "task-master-ai/dist/task-manager-DUDaX5UM.js" {
  interface TaskMasterOptions {
    projectRoot?: string;
    tag?: string;
    mcpLog?: unknown;
    session?: unknown;
  }

  export function setTaskStatus(
    tasksPath: string, taskId: string, status: string, options?: TaskMasterOptions
  ): Promise<{ success: boolean; updatedTasks?: unknown[] }>;

  export function addTask(
    tasksPath: string, title: string, tags?: string[], priority?: string | null,
    options?: TaskMasterOptions, outputType?: string, description?: string | null, isTemplate?: boolean
  ): Promise<{ success: boolean; task?: unknown }>;

  export function expandTask(
    tasksPath: string, taskId: string, numSubtasks: number, useResearch?: boolean,
    additionalContext?: string, options?: TaskMasterOptions, isForce?: boolean
  ): Promise<{ success: boolean; subtasks?: unknown[] }>;

  export function listTasks(
    tasksPath: string, filter: string, complexityReportPath?: string | null,
    includeSubtasks?: boolean, outputType?: string, options?: TaskMasterOptions
  ): Promise<{ tasks: unknown[]; filter: string; stats: unknown }>;

  export function findNextTask(tasksArray: unknown[], tagName?: string | null): unknown | null;

  export function findTaskById(
    tasksArray: unknown[], taskId: string, projectRoot?: string | null, tag?: string | null
  ): { task: unknown | null };

  export function removeTask(
    tasksPath: string, taskIds: string, options?: TaskMasterOptions
  ): Promise<{ success: boolean; removedTasks?: unknown[] }>;

  export function addSubtask(
    tasksPath: string, parentTaskId: string, title?: string | null,
    description?: string | null, isTemplate?: boolean, options?: TaskMasterOptions
  ): Promise<{ success: boolean; subtask?: unknown }>;

  export function removeSubtask(
    tasksPath: string, subtaskId: string, useResearch?: boolean,
    useForce?: boolean, options?: TaskMasterOptions
  ): Promise<{ success: boolean }>;

  export function updateTaskById(
    tasksPath: string, taskId: string, prompt: string, useResearch?: boolean,
    options?: TaskMasterOptions, outputType?: string, isForce?: boolean
  ): Promise<{ success: boolean; task?: unknown }>;

  export function updateSubtaskById(
    tasksPath: string, subtaskId: string, prompt: string, useResearch?: boolean,
    options?: TaskMasterOptions, outputType?: string
  ): Promise<{ success: boolean; subtask?: unknown }>;

  export function performResearch(
    config: Record<string, unknown>, options?: TaskMasterOptions,
    mcpConfig?: Record<string, unknown>, outputType?: string, save?: boolean
  ): Promise<{ success: boolean; research?: string }>;

  export function analyzeTaskComplexity(
    config: Record<string, unknown>, options?: TaskMasterOptions
  ): Promise<{ success: boolean }>;

  export function parsePRD(
    prdContent: string, outputPath: string, outputFormat: string, options?: Record<string, unknown>
  ): Promise<{ success: boolean; tasks?: unknown[] }>;

  // --- New: missing from original declarations ---

  export function moveTask(
    tasksPath: string, taskIdWithOpts: string, targetTag?: string
  ): Promise<{ success: boolean }>;

  export function clearSubtasks(
    tasksPath: string, options?: TaskMasterOptions
  ): Promise<{ success: boolean }>;

  export function expandAllTasks(
    tasksPath: string, options?: TaskMasterOptions
  ): Promise<{ success: boolean }>;

  export function updateTasks(
    tasksPath: string, fromIdAndPrompt: string, options?: TaskMasterOptions
  ): Promise<{ success: boolean }>;

  export function readComplexityReport(): Promise<{ success: boolean; report?: unknown }>;

  export function migrateProject(options?: { force?: boolean; dryRun?: boolean; yes?: boolean }): Promise<void>;
}

declare module "task-master-ai/dist/tag-management-CnaNpeIP.js" {
  export function createTag(tasksPath: string, tagName: string): Promise<{ success: boolean }>;
  export function deleteTag(tasksPath: string, tagName: string): Promise<{ success: boolean }>;
  export function tags(tasksPath: string): Promise<{ success: boolean; tags?: string[] }>;
  export function useTag(tasksPath: string, tagName: string): Promise<{ success: boolean }>;
  export function renameTag(tasksPath: string, oldName: string, newName: string): Promise<{ success: boolean }>;
  export function copyTag(tasksPath: string, srcTag: string, destTag: string): Promise<{ success: boolean }>;
  export function switchCurrentTag(tasksPath: string, tagName: string): Promise<{ success: boolean }>;
  export function createTagFromBranch(tasksPath: string, branchName: string): Promise<{ success: boolean }>;
  export function updateBranchTagMapping(tasksPath: string, mapping: Record<string, string>): Promise<{ success: boolean }>;
}
