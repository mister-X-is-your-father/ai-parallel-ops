/**
 * Thin facade over TaskService for backwards compatibility.
 * All logic lives in services/task-service.ts.
 */
import { createTaskService } from "./container";
import type { Subtask, Task, ChatMessage, ProjectTasks } from "./domain/types";

// Re-export types from domain
export type { Subtask, Task, EnrichedTask, ChatMessage, ChatAction, ProjectTasks } from "./domain/types";

// Re-export computeDependencyMetadata from domain
export { computeDependencyMetadata } from "./domain/dependency";

const svc = () => createTaskService();

export function getProjects(): Record<string, string> {
  return svc().getProjects();
}

export function getAllTasks(): Record<string, ProjectTasks> {
  return svc().getAllTasks();
}

export function updateTaskStatus(project: string, taskId: number, status: string): boolean {
  return svc().updateTaskStatus(project, taskId, status);
}

export function updateTaskFields(
  project: string,
  taskId: number,
  fields: { title?: string; description?: string; contextFiles?: string[]; acceptanceCriteria?: string[]; startCommit?: string; branch?: string; prUrl?: string }
): boolean {
  return svc().updateTaskFields(project, taskId, fields);
}

export function addSubtask(project: string, taskId: number, title: string, parentSubtaskId?: number): Subtask | null {
  return svc().addSubtask(project, taskId, title, parentSubtaskId);
}

export function updateSubtaskStatus(project: string, taskId: number, subtaskId: number, status: string): boolean {
  return svc().updateSubtaskStatus(project, taskId, subtaskId, status);
}

export function deleteSubtask(project: string, taskId: number, subtaskId: number): boolean {
  return svc().deleteSubtask(project, taskId, subtaskId);
}

export function addTask(
  project: string,
  fields: { title: string; description: string; priority?: string; subtasks?: string[]; contextFiles?: string[] }
): Task | null {
  return svc().addTask(project, fields);
}

export function addChatMessage(project: string, taskId: number, message: ChatMessage): boolean {
  return svc().addChatMessage(project, taskId, message);
}

export function getChatHistory(project: string, taskId: number): ChatMessage[] {
  return svc().getChatHistory(project, taskId);
}
