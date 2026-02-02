/**
 * Thin facade over TaskMasterService for backwards compatibility.
 * All logic lives in services/task-master-service.ts.
 */
import { createTaskMasterService, resolveProjectDir as _resolveProjectDir } from "./container";

export { resolveProjectDir } from "./container";

const svc = () => createTaskMasterService();

// --- Fast CRUD ---

export function tmSetStatus(projectDir: string, taskId: string | number, status: string) {
  return svc().setStatus(projectDir, taskId, status);
}

export function tmAddSubtask(projectDir: string, parentId: string | number, title: string) {
  return svc().addSubtask(projectDir, parentId, title);
}

export function tmRemoveSubtask(projectDir: string, parentDotSubtaskId: string) {
  return svc().removeSubtask(projectDir, parentDotSubtaskId);
}

export function tmRemoveTask(projectDir: string, taskId: string | number) {
  return svc().removeTask(projectDir, taskId);
}

export function tmAddDependency(projectDir: string, taskId: string | number, dependsOn: string | number) {
  return svc().addDependency(projectDir, taskId, dependsOn);
}

export function tmRemoveDependency(projectDir: string, taskId: string | number, dependsOn: string | number) {
  return svc().removeDependency(projectDir, taskId, dependsOn);
}

export function tmShow(projectDir: string, taskId: string | number) {
  return svc().show(projectDir, taskId);
}

export function tmNext(projectDir: string) {
  return svc().next(projectDir);
}

// --- AI operations ---

export function tmAddTask(projectDir: string, prompt: string, opts?: { priority?: string; dependencies?: string }) {
  return svc().addTask(projectDir, prompt, opts);
}

export function tmUpdateTask(projectDir: string, taskId: string | number, prompt: string) {
  return svc().updateTask(projectDir, taskId, prompt);
}

export function tmUpdateSubtask(projectDir: string, parentDotSubtaskId: string, prompt: string) {
  return svc().updateSubtask(projectDir, parentDotSubtaskId, prompt);
}

export function tmExpand(projectDir: string, taskId: string | number, opts?: { num?: number; research?: boolean }) {
  return svc().expand(projectDir, taskId, opts);
}

export function tmResearch(projectDir: string, prompt: string, taskIds?: string) {
  return svc().research(projectDir, prompt, taskIds);
}

export function tmAnalyzeComplexity(projectDir: string, taskIds?: string) {
  return svc().analyzeComplexity(projectDir, taskIds);
}

export function tmParsePrd(projectDir: string, inputFile: string) {
  return svc().parsePrd(projectDir, inputFile);
}
