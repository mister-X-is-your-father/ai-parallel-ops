import {
  readFileSync,
  writeFileSync,
  existsSync,
  type PathLike,
} from "fs";
import { join } from "path";
import type { Task, ProjectTasks } from "../domain/types";

export interface TaskRepository {
  getAllTasks(): Record<string, ProjectTasks>;
  getProjects(): Record<string, string>;
  findTask(
    project: string,
    taskId: number
  ): {
    data: Record<string, unknown>;
    task: Task;
    filePath: string;
  } | null;
  saveFile(filePath: string, data: unknown): void;
}

export interface FileSystem {
  readFileSync(path: PathLike, encoding: BufferEncoding): string;
  writeFileSync(path: PathLike, data: string): void;
  existsSync(path: PathLike): boolean;
}

const defaultFs: FileSystem = { readFileSync, writeFileSync, existsSync };

export class FileTaskRepository implements TaskRepository {
  constructor(
    private hubTasksPath: string,
    private projectsFilePath: string,
    private fs: FileSystem = defaultFs
  ) {}

  getProjects(): Record<string, string> {
    try {
      if (this.fs.existsSync(this.projectsFilePath)) {
        return JSON.parse(
          this.fs.readFileSync(this.projectsFilePath, "utf-8")
        );
      }
    } catch {}
    return {};
  }

  getAllTasks(): Record<string, ProjectTasks> {
    const result: Record<string, ProjectTasks> = {};

    // Hub tasks
    try {
      const hub = JSON.parse(
        this.fs.readFileSync(this.hubTasksPath, "utf-8")
      );
      for (const [key, val] of Object.entries(hub)) {
        const v = val as ProjectTasks;
        if (v.tasks) result[key] = v;
      }
    } catch {}

    // Per-project tasks
    const projects = this.getProjects();
    for (const [name, dir] of Object.entries(projects)) {
      try {
        const f = join(dir, ".taskmaster", "tasks", "tasks.json");
        const data = JSON.parse(this.fs.readFileSync(f, "utf-8"));
        if (data.default) {
          result[name] = data.default;
        } else if (data.tasks) {
          result[name] = { tasks: data.tasks, metadata: data.metadata || {} };
        } else {
          // Tag-keyed format: {"master": {"tasks": [...]}}
          const keys = Object.keys(data);
          if (keys.length === 1 && data[keys[0]]?.tasks) {
            result[name] = data[keys[0]];
          }
        }
      } catch {}
    }

    return result;
  }

  findTask(
    project: string,
    taskId: number
  ): {
    data: Record<string, unknown>;
    task: Task;
    filePath: string;
  } | null {
    // Try hub file
    try {
      const data = JSON.parse(
        this.fs.readFileSync(this.hubTasksPath, "utf-8")
      );
      const projectData = data[project] as ProjectTasks | undefined;
      if (projectData?.tasks) {
        const task = projectData.tasks.find((t: Task) => t.id === taskId);
        if (task) return { data, task, filePath: this.hubTasksPath };
      }
    } catch {}

    // Try project-specific file
    const projects = this.getProjects();
    const dir = projects[project];
    if (!dir) return null;
    try {
      const f = join(dir, ".taskmaster", "tasks", "tasks.json");
      const data = JSON.parse(this.fs.readFileSync(f, "utf-8"));
      let tasks = data.default?.tasks || data.tasks;
      if (!tasks) {
        const keys = Object.keys(data);
        if (keys.length === 1 && data[keys[0]]?.tasks) tasks = data[keys[0]].tasks;
      }
      const task = tasks?.find((t: Task) => t.id === taskId);
      if (task) return { data, task, filePath: f };
    } catch {}
    return null;
  }

  saveFile(filePath: string, data: unknown): void {
    this.fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }
}
