import type { TaskRepository } from "../infrastructure/task-repository";
import type { Subtask, Task, TaskStatus, TaskPriority, ChatMessage, ProjectTasks } from "../domain/types";
import {
  findSubtaskRecursive,
  findSubtaskParent,
  maxSubtaskId,
  allSubtasksDone,
} from "../domain/tree";

export class TaskService {
  constructor(private repo: TaskRepository) {}

  getProjects(): Record<string, string> {
    return this.repo.getProjects();
  }

  getAllTasks(): Record<string, ProjectTasks> {
    return this.repo.getAllTasks();
  }

  updateTaskStatus(project: string, taskId: number, status: string): boolean {
    const found = this.repo.findTask(project, taskId);
    if (!found) return false;
    found.task.status = status as TaskStatus;
    this.repo.saveFile(found.filePath, found.data);
    return true;
  }

  updateTaskFields(
    project: string,
    taskId: number,
    fields: {
      title?: string;
      description?: string;
      contextFiles?: string[];
      acceptanceCriteria?: string[];
      startCommit?: string;
      branch?: string;
      prUrl?: string;
    }
  ): boolean {
    const found = this.repo.findTask(project, taskId);
    if (!found) return false;
    if (fields.title !== undefined) found.task.title = fields.title;
    if (fields.description !== undefined) found.task.description = fields.description;
    if (fields.contextFiles !== undefined) found.task.contextFiles = fields.contextFiles;
    if (fields.acceptanceCriteria !== undefined) found.task.acceptanceCriteria = fields.acceptanceCriteria;
    if (fields.startCommit !== undefined) found.task.startCommit = fields.startCommit;
    if (fields.branch !== undefined) found.task.branch = fields.branch;
    if (fields.prUrl !== undefined) found.task.prUrl = fields.prUrl;
    this.repo.saveFile(found.filePath, found.data);
    return true;
  }

  addSubtask(
    project: string,
    taskId: number,
    title: string,
    parentSubtaskId?: number
  ): Subtask | null {
    const found = this.repo.findTask(project, taskId);
    if (!found) return null;
    const { data, task, filePath } = found;
    if (!task.subtasks) task.subtasks = [];
    const newId = maxSubtaskId(task.subtasks) + 1;
    const subtask: Subtask = { id: newId, title, status: "pending" };

    if (parentSubtaskId) {
      const parent = findSubtaskRecursive(task.subtasks, parentSubtaskId);
      if (!parent) return null;
      if (!parent.subtasks) parent.subtasks = [];
      parent.subtasks.push(subtask);
    } else {
      task.subtasks.push(subtask);
    }
    this.repo.saveFile(filePath, data);
    return subtask;
  }

  updateSubtaskStatus(
    project: string,
    taskId: number,
    subtaskId: number,
    status: string
  ): boolean {
    const found = this.repo.findTask(project, taskId);
    if (!found) return false;
    const { data, task, filePath } = found;
    if (!task.subtasks) return false;
    const sub = findSubtaskRecursive(task.subtasks, subtaskId);
    if (!sub) return false;
    sub.status = status as TaskStatus;
    if (task.subtasks.length > 0 && allSubtasksDone(task.subtasks)) {
      if (task.status === "in-progress") task.status = "done";
    }
    this.repo.saveFile(filePath, data);
    return true;
  }

  deleteSubtask(project: string, taskId: number, subtaskId: number): boolean {
    const found = this.repo.findTask(project, taskId);
    if (!found) return false;
    const { data, task, filePath } = found;
    if (!task.subtasks) return false;
    const parent = findSubtaskParent(task.subtasks, subtaskId);
    if (!parent) return false;
    parent.arr.splice(parent.idx, 1);
    this.repo.saveFile(filePath, data);
    return true;
  }

  addTask(
    project: string,
    fields: {
      title: string;
      description: string;
      priority?: string;
      subtasks?: string[];
      contextFiles?: string[];
    }
  ): Task | null {
    const allTasks = this.repo.getAllTasks();
    const projectData = allTasks[project];
    const existingTasks = projectData?.tasks || [];
    const maxId = existingTasks.reduce((m: number, t: Task) => Math.max(m, t.id), 0);
    const newTask: Task = {
      id: maxId + 1,
      title: fields.title,
      description: fields.description,
      status: "pending",
      priority: (fields.priority || "medium") as TaskPriority,
      dependencies: [],
      contextFiles: fields.contextFiles || [],
      subtasks: (fields.subtasks || []).map((s, i) => ({
        id: i + 1,
        title: s,
        status: "pending",
      })),
    };

    if (existingTasks.length > 0) {
      const found = this.repo.findTask(project, existingTasks[0].id);
      if (found) {
        const tasksArr =
          (found.data[project] as { tasks: Task[] })?.tasks ||
          (found.data as { default?: { tasks: Task[] }; tasks?: Task[] }).default?.tasks ||
          (found.data as { tasks?: Task[] }).tasks;
        if (tasksArr) {
          tasksArr.push(newTask);
          this.repo.saveFile(found.filePath, found.data);
          return newTask;
        }
      }
    }

    return null;
  }

  addChatMessage(project: string, taskId: number, message: ChatMessage): boolean {
    const found = this.repo.findTask(project, taskId);
    if (!found) return false;
    const { data, task, filePath } = found;
    if (!task.chatHistory) task.chatHistory = [];
    task.chatHistory.push(message);
    this.repo.saveFile(filePath, data);
    return true;
  }

  getChatHistory(project: string, taskId: number): ChatMessage[] {
    const found = this.repo.findTask(project, taskId);
    if (!found) return [];
    return found.task.chatHistory || [];
  }
}
