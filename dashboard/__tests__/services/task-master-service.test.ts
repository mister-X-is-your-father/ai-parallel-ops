import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the task-master-ai module before importing the service
vi.mock("task-master-ai/dist/task-manager-DUDaX5UM.js", () => ({
  setTaskStatus: vi.fn(async () => ({ success: true })),
  addTask: vi.fn(async () => ({ success: true, task: {} })),
  expandTask: vi.fn(async () => ({ success: true, subtasks: [] })),
  listTasks: vi.fn(async () => ({ tasks: [] })),
  findNextTask: vi.fn(() => null),
  removeTask: vi.fn(async () => ({ success: true })),
  addSubtask: vi.fn(async () => ({ success: true })),
  removeSubtask: vi.fn(async () => ({ success: true })),
  updateTaskById: vi.fn(async () => ({ success: true })),
  updateSubtaskById: vi.fn(async () => ({ success: true })),
  performResearch: vi.fn(async () => ({ success: true })),
  analyzeTaskComplexity: vi.fn(async () => ({ success: true })),
  parsePRD: vi.fn(async () => ({ success: true })),
  findTaskById: vi.fn(() => ({ task: null })),
}));

// Mock fs for resolveTag/resolveTasksPath
vi.mock("fs", async () => {
  const actual = await vi.importActual("fs");
  return {
    ...actual,
    existsSync: vi.fn(() => false),
    readFileSync: vi.fn(() => JSON.stringify({ master: { tasks: [] } })),
  };
});

import { TaskMasterService } from "../../lib/services/task-master-service";
import * as tmApi from "task-master-ai/dist/task-manager-DUDaX5UM.js";

describe("TaskMasterService (direct API)", () => {
  let resolver: (project: string) => string;
  let svc: TaskMasterService;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = vi.fn((p: string) => `/resolved/${p}`);
    svc = new TaskMasterService(resolver);
  });

  it("setStatus calls setTaskStatus with correct args", async () => {
    await svc.setStatus("myProject", 5, "done");
    expect(resolver).toHaveBeenCalledWith("myProject");
    expect(tmApi.setTaskStatus).toHaveBeenCalledWith(
      "/resolved/myProject/.taskmaster/tasks/tasks.json",
      "5",
      "done",
      expect.objectContaining({ projectRoot: "/resolved/myProject" })
    );
  });

  it("addSubtask calls tmAddSubtaskFn", async () => {
    await svc.addSubtask("proj", 3, "My subtask");
    expect(tmApi.addSubtask).toHaveBeenCalledWith(
      "/resolved/proj/.taskmaster/tasks/tasks.json",
      "3",
      "My subtask",
      null,
      false,
      expect.objectContaining({ projectRoot: "/resolved/proj" })
    );
  });

  it("removeSubtask passes dot notation id", async () => {
    await svc.removeSubtask("proj", "5.2");
    expect(tmApi.removeSubtask).toHaveBeenCalledWith(
      "/resolved/proj/.taskmaster/tasks/tasks.json",
      "5.2",
      false,
      false,
      expect.objectContaining({ projectRoot: "/resolved/proj" })
    );
  });

  it("removeTask passes taskId", async () => {
    await svc.removeTask("proj", 7);
    expect(tmApi.removeTask).toHaveBeenCalledWith(
      "/resolved/proj/.taskmaster/tasks/tasks.json",
      "7",
      expect.objectContaining({ projectRoot: "/resolved/proj" })
    );
  });

  it("addTask calls with prompt and priority", async () => {
    await svc.addTask("proj", "Build auth", { priority: "high" });
    expect(tmApi.addTask).toHaveBeenCalledWith(
      "/resolved/proj/.taskmaster/tasks/tasks.json",
      "Build auth",
      [],
      "high",
      expect.objectContaining({ projectRoot: "/resolved/proj" }),
      "json"
    );
  });

  it("updateTask calls updateTaskById", async () => {
    await svc.updateTask("proj", 5, "Refine this");
    expect(tmApi.updateTaskById).toHaveBeenCalledWith(
      "/resolved/proj/.taskmaster/tasks/tasks.json",
      "5",
      "Refine this",
      false,
      expect.objectContaining({ projectRoot: "/resolved/proj" }),
      "json"
    );
  });

  it("expand calls expandTask with options", async () => {
    await svc.expand("proj", 3, { num: 8, research: true });
    expect(tmApi.expandTask).toHaveBeenCalledWith(
      "/resolved/proj/.taskmaster/tasks/tasks.json",
      "3",
      8,
      true,
      "",
      expect.objectContaining({ projectRoot: "/resolved/proj" }),
    );
  });

  it("expand defaults to 5 subtasks", async () => {
    await svc.expand("proj", 3);
    expect(tmApi.expandTask).toHaveBeenCalledWith(
      expect.any(String),
      "3",
      5,
      false,
      "",
      expect.anything(),
    );
  });

  it("addDependency returns err when tasks.json missing", async () => {
    const result = await svc.addDependency("proj", 1, 2);
    expect(result.isErr()).toBe(true);
  });

  it("removeDependency returns err when tasks.json missing", async () => {
    const result = await svc.removeDependency("proj", 1, 2);
    expect(result.isErr()).toBe(true);
  });
});
