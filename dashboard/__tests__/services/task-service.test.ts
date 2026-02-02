import { describe, it, expect, vi, beforeEach } from "vitest";
import { TaskService } from "../../lib/services/task-service";
import type { TaskRepository } from "../../lib/infrastructure/task-repository";
import type { Task } from "../../lib/domain/types";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: "Test task",
    description: "desc",
    status: "pending",
    priority: "medium",
    dependencies: [],
    subtasks: [],
    ...overrides,
  };
}

function createMockRepo(tasks: Task[] = [makeTask()]): TaskRepository & { saved: Array<{ path: string; data: unknown }> } {
  const data = { testProject: { tasks, metadata: {} } };
  const saved: Array<{ path: string; data: unknown }> = [];
  return {
    saved,
    getAllTasks: vi.fn(() => ({ testProject: { tasks, metadata: {} } })),
    getProjects: vi.fn(() => ({ testProject: "/tmp/test" })),
    findTask: vi.fn((project: string, taskId: number) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return null;
      return { data, task, filePath: "/tmp/tasks.json" };
    }),
    saveFile: vi.fn((path: string, d: unknown) => { saved.push({ path, data: d }); }),
  };
}

describe("TaskService", () => {
  let repo: ReturnType<typeof createMockRepo>;
  let svc: TaskService;

  beforeEach(() => {
    repo = createMockRepo();
    svc = new TaskService(repo);
  });

  describe("getAllTasks", () => {
    it("delegates to repo", () => {
      const result = svc.getAllTasks();
      expect(result).toHaveProperty("testProject");
      expect(repo.getAllTasks).toHaveBeenCalled();
    });
  });

  describe("updateTaskStatus", () => {
    it("updates status and saves", () => {
      const ok = svc.updateTaskStatus("testProject", 1, "done");
      expect(ok).toBe(true);
      expect(repo.saveFile).toHaveBeenCalledWith("/tmp/tasks.json", expect.anything());
    });

    it("returns false for missing task", () => {
      expect(svc.updateTaskStatus("testProject", 999, "done")).toBe(false);
    });
  });

  describe("updateTaskFields", () => {
    it("updates title", () => {
      const ok = svc.updateTaskFields("testProject", 1, { title: "New title" });
      expect(ok).toBe(true);
      const task = repo.findTask("testProject", 1)?.task;
      expect(task?.title).toBe("New title");
    });

    it("updates contextFiles", () => {
      svc.updateTaskFields("testProject", 1, { contextFiles: ["a.md"] });
      const task = repo.findTask("testProject", 1)?.task;
      expect(task?.contextFiles).toEqual(["a.md"]);
    });
  });

  describe("addSubtask", () => {
    it("adds subtask with incrementing id", () => {
      const sub = svc.addSubtask("testProject", 1, "Sub 1");
      expect(sub).toEqual({ id: 1, title: "Sub 1", status: "pending" });
      expect(repo.saveFile).toHaveBeenCalled();
    });

    it("returns null for missing task", () => {
      expect(svc.addSubtask("testProject", 999, "Sub")).toBeNull();
    });

    it("adds nested subtask", () => {
      const task = makeTask({ subtasks: [{ id: 1, title: "Parent sub", status: "pending", subtasks: [] }] });
      repo = createMockRepo([task]);
      svc = new TaskService(repo);
      const sub = svc.addSubtask("testProject", 1, "Nested", 1);
      expect(sub).toBeTruthy();
      expect(sub!.id).toBe(2);
    });
  });

  describe("updateSubtaskStatus", () => {
    it("updates subtask status", () => {
      const task = makeTask({ subtasks: [{ id: 1, title: "Sub", status: "pending" }] });
      repo = createMockRepo([task]);
      svc = new TaskService(repo);
      expect(svc.updateSubtaskStatus("testProject", 1, 1, "done")).toBe(true);
    });

    it("auto-completes parent when all subtasks done", () => {
      const task = makeTask({
        status: "in-progress",
        subtasks: [{ id: 1, title: "Sub", status: "pending" }],
      });
      repo = createMockRepo([task]);
      svc = new TaskService(repo);
      svc.updateSubtaskStatus("testProject", 1, 1, "done");
      expect(task.status).toBe("done");
    });

    it("does NOT auto-complete if parent not in-progress", () => {
      const task = makeTask({
        status: "pending",
        subtasks: [{ id: 1, title: "Sub", status: "pending" }],
      });
      repo = createMockRepo([task]);
      svc = new TaskService(repo);
      svc.updateSubtaskStatus("testProject", 1, 1, "done");
      expect(task.status).toBe("pending");
    });
  });

  describe("deleteSubtask", () => {
    it("removes subtask", () => {
      const task = makeTask({ subtasks: [{ id: 1, title: "Sub", status: "pending" }] });
      repo = createMockRepo([task]);
      svc = new TaskService(repo);
      expect(svc.deleteSubtask("testProject", 1, 1)).toBe(true);
      expect(task.subtasks).toHaveLength(0);
    });
  });

  describe("addTask", () => {
    it("creates task with auto-incremented id", () => {
      const existing = makeTask({ id: 5 });
      const data = { testProject: { tasks: [existing], metadata: {} } };
      repo = {
        ...createMockRepo([existing]),
        findTask: vi.fn(() => ({ data, task: existing, filePath: "/tmp/tasks.json" })),
      };
      svc = new TaskService(repo);
      const task = svc.addTask("testProject", { title: "New", description: "Desc" });
      expect(task).toBeTruthy();
      expect(task!.id).toBe(6);
      expect(task!.status).toBe("pending");
    });
  });

  describe("chat", () => {
    it("adds and retrieves chat messages", () => {
      svc.addChatMessage("testProject", 1, {
        role: "user",
        content: "Hello",
        timestamp: 123,
      });
      const history = svc.getChatHistory("testProject", 1);
      expect(history).toHaveLength(1);
      expect(history[0].content).toBe("Hello");
    });
  });
});
