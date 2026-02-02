"use server";

import { createTaskService, createTaskMasterService, createGitService, resolveProjectDir } from "../container";
import { computeDependencyMetadata } from "../domain/dependency";
import { isValidTmStatus } from "../domain/validators";
import type { ChatMessage } from "../domain/types";
import {
  CreateTaskSchema, DeleteTaskSchema, AddChatSchema,
  SubtaskAddSchema, SubtaskUpdateStatusSchema, SubtaskDeleteSchema,
  UpdateStatusSchema, UpdateFieldsSchema,
} from "../schemas/tasks";

type ActionResult<T = unknown> = { success: true; data: T } | { success: false; error: string };

const taskService = () => createTaskService();
const tmService = () => createTaskMasterService();
const gitService = () => createGitService();

export async function getAllTasks() {
  const allTasks = taskService().getAllTasks();
  const enriched: Record<string, unknown> = {};
  for (const [name, data] of Object.entries(allTasks)) {
    enriched[name] = { ...data, tasks: computeDependencyMetadata(data.tasks) };
  }
  return enriched;
}

export async function createTask(input: unknown): Promise<ActionResult> {
  const parsed = CreateTaskSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues.map(i => i.message).join(", ") };
  const { project, title, description, priority, subtasks, contextFiles } = parsed.data;
  const task = taskService().addTask(project, { title, description, priority, subtasks, contextFiles });
  return task ? { success: true, data: task } : { success: false, error: "project not found" };
}

export async function deleteTask(input: unknown): Promise<ActionResult> {
  const parsed = DeleteTaskSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues.map(i => i.message).join(", ") };
  const result = await tmService().removeTask(parsed.data.project, parsed.data.taskId);
  return result.match(
    (data) => ({ success: true as const, data }),
    (error) => ({ success: false as const, error: error.message }),
  );
}

export async function addChatMessage(input: unknown): Promise<ActionResult> {
  const parsed = AddChatSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues.map(i => i.message).join(", ") };
  const { project, taskId, role, content, actions } = parsed.data;
  const ok = taskService().addChatMessage(project, taskId, {
    role, content, timestamp: Date.now(), actions,
  } as ChatMessage);
  return { success: ok, data: null } as ActionResult;
}

export async function addSubtask(input: unknown): Promise<ActionResult> {
  const parsed = SubtaskAddSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues.map(i => i.message).join(", ") };
  const result = await tmService().addSubtask(parsed.data.project, parsed.data.taskId, parsed.data.subtaskTitle);
  return result.match(
    (data) => ({ success: true as const, data }),
    (error) => ({ success: false as const, error: error.message }),
  );
}

export async function updateSubtaskStatus(input: unknown): Promise<ActionResult> {
  const parsed = SubtaskUpdateStatusSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues.map(i => i.message).join(", ") };
  const { project, taskId, subtaskId, subtaskStatus } = parsed.data;
  const ok = taskService().updateSubtaskStatus(project, taskId, subtaskId, subtaskStatus);
  return { success: ok, data: null } as ActionResult;
}

export async function deleteSubtask(input: unknown): Promise<ActionResult> {
  const parsed = SubtaskDeleteSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues.map(i => i.message).join(", ") };
  const result = await tmService().removeSubtask(parsed.data.project, `${parsed.data.taskId}.${parsed.data.subtaskId}`);
  return result.match(
    (data) => ({ success: true as const, data }),
    (error) => ({ success: false as const, error: error.message }),
  );
}

async function autoCreatePrIfNeeded(project: string, taskId: number, status: string): Promise<void> {
  if (status !== "done" && status !== "review") return;
  try {
    const allTasks = taskService().getAllTasks();
    const task = allTasks[project]?.tasks?.find((t) => t.id === taskId);
    if (task) {
      const dir = resolveProjectDir(project);
      const prUrl = gitService().autoCreatePr(dir, task);
      if (prUrl) taskService().updateTaskFields(project, taskId, { prUrl });
    }
  } catch { /* Non-critical */ }
}

export async function updateStatus(input: unknown): Promise<ActionResult> {
  const parsed = UpdateStatusSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues.map(i => i.message).join(", ") };
  const { project, taskId, status } = parsed.data;

  if (isValidTmStatus(status)) {
    const result = await tmService().setStatus(project, taskId, status);
    if (result.isOk()) await autoCreatePrIfNeeded(project, taskId, status);
    return result.match(
      (data) => ({ success: true as const, data }),
      (error) => ({ success: false as const, error: error.message }),
    );
  } else {
    const ok = taskService().updateTaskStatus(project, taskId, status);
    return { success: ok, data: null } as ActionResult;
  }
}

export async function updateFields(input: unknown): Promise<ActionResult> {
  const parsed = UpdateFieldsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues.map(i => i.message).join(", ") };
  const { project, taskId, title, description, contextFiles, acceptanceCriteria } = parsed.data;
  const ok = taskService().updateTaskFields(project, taskId, { title, description, contextFiles, acceptanceCriteria });
  return { success: ok, data: null } as ActionResult;
}
