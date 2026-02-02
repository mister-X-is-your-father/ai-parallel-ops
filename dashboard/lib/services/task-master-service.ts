import { join } from "path";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { ok, err, Result } from "neverthrow";
import {
  addDependencyPure, removeDependencyPure, validateDependencies, fixDependenciesPure,
} from "../domain/dependency";

// Direct imports from task-master-ai Node.js API
import {
  setTaskStatus,
  addTask as tmAddTaskFn,
  expandTask as tmExpandFn,
  expandAllTasks as tmExpandAllFn,
  listTasks as tmListFn,
  findNextTask as tmFindNextFn,
  removeTask as tmRemoveFn,
  addSubtask as tmAddSubtaskFn,
  removeSubtask as tmRemoveSubtaskFn,
  updateTaskById,
  updateSubtaskById,
  updateTasks as tmUpdateTasksFn,
  moveTask as tmMoveTaskFn,
  clearSubtasks as tmClearSubtasksFn,
  readComplexityReport as tmReadComplexityReportFn,
  performResearch,
  analyzeTaskComplexity,
  parsePRD,
  findTaskById,
  migrateProject as tmMigrateProjectFn,
} from "task-master-ai/dist/task-manager-DUDaX5UM.js";

import {
  createTag as tmCreateTagFn,
  deleteTag as tmDeleteTagFn,
  tags as tmListTagsFn,
  useTag as tmUseTagFn,
  renameTag as tmRenameTagFn,
  copyTag as tmCopyTagFn,
} from "task-master-ai/dist/tag-management-CnaNpeIP.js";

export interface AppError {
  message: string;
  code: string;
}

function toErr(e: unknown): AppError {
  return { message: e instanceof Error ? e.message : String(e), code: "TM_ERROR" };
}

type R<T = unknown> = Promise<Result<T, AppError>>;

function resolveTasksPath(projectDir: string): string {
  return join(projectDir, ".taskmaster", "tasks", "tasks.json");
}

function resolveTag(projectDir: string): string {
  try {
    const statePath = join(projectDir, ".taskmaster", "state.json");
    if (existsSync(statePath)) {
      const state = JSON.parse(readFileSync(statePath, "utf-8"));
      if (state.currentTag) return state.currentTag;
    }
  } catch {}
  try {
    const tasksPath = resolveTasksPath(projectDir);
    const data = JSON.parse(readFileSync(tasksPath, "utf-8"));
    const keys = Object.keys(data);
    if (keys.length === 1) return keys[0];
  } catch {}
  return "master";
}

function opts(projectDir: string) {
  return { projectRoot: projectDir, tag: resolveTag(projectDir) };
}

export class TaskMasterService {
  constructor(private projectResolver: (project: string) => string) {}

  private dir(project: string) { return this.projectResolver(project); }
  private path(project: string) { return resolveTasksPath(this.dir(project)); }
  private opts(project: string) { return opts(this.dir(project)); }

  private readTasks(project: string): { tasks: unknown[]; tag: string } {
    const p = this.path(project);
    const o = this.opts(project);
    const data = JSON.parse(readFileSync(p, "utf-8"));
    return { tasks: data[o.tag]?.tasks || data.tasks || [], tag: o.tag };
  }

  // --- Status & CRUD ---

  async setStatus(project: string, taskId: string | number, status: string): R {
    try {
      return ok(await setTaskStatus(this.path(project), String(taskId), status, this.opts(project)));
    } catch (e) { return err(toErr(e)); }
  }

  async addSubtask(project: string, parentId: string | number, title: string): R {
    try {
      return ok(await tmAddSubtaskFn(this.path(project), String(parentId), title, null, false, this.opts(project)));
    } catch (e) { return err(toErr(e)); }
  }

  async removeSubtask(project: string, parentDotSubtaskId: string): R {
    try {
      return ok(await tmRemoveSubtaskFn(this.path(project), parentDotSubtaskId, false, false, this.opts(project)));
    } catch (e) { return err(toErr(e)); }
  }

  async removeTask(project: string, taskId: string | number): R {
    try {
      return ok(await tmRemoveFn(this.path(project), String(taskId), this.opts(project)));
    } catch (e) { return err(toErr(e)); }
  }

  async show(project: string, taskId: string | number): R {
    try {
      const { tasks, tag } = this.readTasks(project);
      return ok(findTaskById(tasks, String(taskId), this.opts(project).projectRoot, tag));
    } catch (e) { return err(toErr(e)); }
  }

  async next(project: string): R {
    try {
      const { tasks, tag } = this.readTasks(project);
      return ok(tmFindNextFn(tasks, tag));
    } catch (e) { return err(toErr(e)); }
  }

  // --- Dependency management (pure domain logic + JSON I/O wrapper) ---

  private readJsonData(project: string) {
    const p = this.path(project);
    const o = this.opts(project);
    const data = JSON.parse(readFileSync(p, "utf-8"));
    const tasks = data[o.tag]?.tasks || data.tasks;
    return { p, data, tasks };
  }

  async addDependency(project: string, taskId: string | number, dependsOn: string | number): R {
    try {
      const { p, data, tasks } = this.readJsonData(project);
      if (!tasks) return err({ message: "No tasks found", code: "NOT_FOUND" });
      const error = addDependencyPure(tasks, Number(taskId), Number(dependsOn));
      if (error) return err({ message: error, code: "NOT_FOUND" });
      writeFileSync(p, JSON.stringify(data, null, 2));
      return ok({ success: true });
    } catch (e) { return err(toErr(e)); }
  }

  async removeDependency(project: string, taskId: string | number, dependsOn: string | number): R {
    try {
      const { p, data, tasks } = this.readJsonData(project);
      if (!tasks) return err({ message: "No tasks found", code: "NOT_FOUND" });
      const error = removeDependencyPure(tasks, Number(taskId), Number(dependsOn));
      if (error) return err({ message: error, code: "NOT_FOUND" });
      writeFileSync(p, JSON.stringify(data, null, 2));
      return ok({ success: true });
    } catch (e) { return err(toErr(e)); }
  }

  async validateDeps(project: string): R<{ valid: boolean; issues: string[] }> {
    try {
      const { tasks } = this.readTasks(project);
      return ok(validateDependencies(tasks as { id: number; dependencies?: number[] }[]));
    } catch (e) { return err(toErr(e)); }
  }

  async fixDeps(project: string): R<{ fixed: number }> {
    try {
      const { p, data, tasks } = this.readJsonData(project);
      if (!tasks) return ok({ fixed: 0 });
      const fixed = fixDependenciesPure(tasks as { id: number; dependencies?: number[] }[]);
      if (fixed > 0) writeFileSync(p, JSON.stringify(data, null, 2));
      return ok({ fixed });
    } catch (e) { return err(toErr(e)); }
  }

  // --- Move & Clear ---

  async moveTask(project: string, taskId: string | number, toTag: string): R {
    try {
      return ok(await tmMoveTaskFn(this.path(project), String(taskId), toTag));
    } catch (e) { return err(toErr(e)); }
  }

  async clearSubtasks(project: string, taskIds?: string): R {
    try {
      const o = { ...this.opts(project), ...(taskIds ? { id: taskIds } : { all: true }) };
      return ok(await tmClearSubtasksFn(this.path(project), o));
    } catch (e) { return err(toErr(e)); }
  }

  // --- AI operations ---

  async addTask(project: string, prompt: string, _opts?: { priority?: string; dependencies?: string }): R {
    try {
      return ok(await tmAddTaskFn(this.path(project), prompt, [], _opts?.priority || null, this.opts(project), "json"));
    } catch (e) { return err(toErr(e)); }
  }

  async updateTask(project: string, taskId: string | number, prompt: string): R {
    try {
      return ok(await updateTaskById(this.path(project), String(taskId), prompt, false, this.opts(project), "json"));
    } catch (e) { return err(toErr(e)); }
  }

  async updateSubtask(project: string, parentDotSubtaskId: string, prompt: string): R {
    try {
      return ok(await updateSubtaskById(this.path(project), parentDotSubtaskId, prompt, false, this.opts(project), "json"));
    } catch (e) { return err(toErr(e)); }
  }

  async updateBulk(project: string, fromId: string | number, prompt: string): R {
    try {
      return ok(await tmUpdateTasksFn(this.path(project), `--from=${fromId} --prompt="${prompt}"`, this.opts(project)));
    } catch (e) { return err(toErr(e)); }
  }

  async expand(project: string, taskId: string | number, expandOpts?: { num?: number; research?: boolean }): R {
    try {
      return ok(await tmExpandFn(
        this.path(project), String(taskId), expandOpts?.num || 5,
        expandOpts?.research || false, "", this.opts(project),
      ));
    } catch (e) { return err(toErr(e)); }
  }

  async expandAll(project: string, expandOpts?: { num?: number; research?: boolean }): R {
    try {
      const o = { ...this.opts(project), num: expandOpts?.num || 5, research: expandOpts?.research || false };
      return ok(await tmExpandAllFn(this.path(project), o));
    } catch (e) { return err(toErr(e)); }
  }

  async research(project: string, prompt: string, taskIds?: string): R {
    try {
      const config: Record<string, unknown> = {
        prompt, projectRoot: this.dir(project), tag: resolveTag(this.dir(project)),
      };
      if (taskIds) config.taskIds = taskIds.split(",");
      return ok(await performResearch(config, this.opts(project)));
    } catch (e) { return err(toErr(e)); }
  }

  async analyzeComplexity(project: string, taskIds?: string): R {
    try {
      const config: Record<string, unknown> = {
        file: this.path(project), projectRoot: this.dir(project), tag: resolveTag(this.dir(project)),
      };
      if (taskIds) config.id = taskIds;
      return ok(await analyzeTaskComplexity(config, this.opts(project)));
    } catch (e) { return err(toErr(e)); }
  }

  async complexityReport(): R {
    try {
      return ok(await tmReadComplexityReportFn());
    } catch (e) { return err(toErr(e)); }
  }

  async parsePrd(project: string, inputFile: string): R {
    try {
      const content = readFileSync(inputFile, "utf-8");
      return ok(await parsePRD(content, this.path(project), "json", this.opts(project)));
    } catch (e) { return err(toErr(e)); }
  }

  // --- Tag management ---

  async createTag(project: string, tagName: string): R {
    try { return ok(await tmCreateTagFn(this.path(project), tagName)); }
    catch (e) { return err(toErr(e)); }
  }

  async deleteTag(project: string, tagName: string): R {
    try { return ok(await tmDeleteTagFn(this.path(project), tagName)); }
    catch (e) { return err(toErr(e)); }
  }

  async listTags(project: string): R {
    try { return ok(await tmListTagsFn(this.path(project))); }
    catch (e) { return err(toErr(e)); }
  }

  async useTag(project: string, tagName: string): R {
    try { return ok(await tmUseTagFn(this.path(project), tagName)); }
    catch (e) { return err(toErr(e)); }
  }

  async renameTag(project: string, oldName: string, newName: string): R {
    try { return ok(await tmRenameTagFn(this.path(project), oldName, newName)); }
    catch (e) { return err(toErr(e)); }
  }

  async copyTag(project: string, srcTag: string, destTag: string): R {
    try { return ok(await tmCopyTagFn(this.path(project), srcTag, destTag)); }
    catch (e) { return err(toErr(e)); }
  }

  // --- Project initialization ---

  async initializeProject(project: string): R {
    try {
      const origCwd = process.cwd();
      process.chdir(this.dir(project));
      try {
        await tmMigrateProjectFn({ yes: true });
        return ok({ success: true });
      } finally {
        process.chdir(origCwd);
      }
    } catch (e) { return err(toErr(e)); }
  }

  // --- Models (read config) ---

  getModels(project: string): Result<{ models: Record<string, unknown>; global?: Record<string, unknown> }, AppError> {
    try {
      const configPath = join(this.dir(project), ".taskmaster", "config.json");
      if (!existsSync(configPath)) return err({ message: "No .taskmaster/config.json found", code: "NOT_FOUND" });
      const config = JSON.parse(readFileSync(configPath, "utf-8"));
      return ok({ models: config.models || {}, global: config.global });
    } catch (e) { return err(toErr(e)); }
  }
}
