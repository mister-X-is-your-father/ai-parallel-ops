import { describe, it, expect } from "vitest";
import { CreateTaskSchema, DeleteTaskSchema, UpdateStatusSchema, SubtaskAddSchema, AddChatSchema } from "../../lib/schemas/tasks";
import { TaskMasterActionSchema } from "../../lib/schemas/task-master";
import { ExecuteSchema } from "../../lib/schemas/execute";
import { AiActionSchema } from "../../lib/schemas/ai";

describe("Task schemas", () => {
  it("CreateTaskSchema validates and applies defaults", () => {
    const result = CreateTaskSchema.parse({
      action: "create",
      project: "proj",
      title: "Hello",
    });
    expect(result.description).toBe("");
    expect(result.priority).toBe("medium");
  });

  it("CreateTaskSchema rejects empty title", () => {
    expect(() => CreateTaskSchema.parse({ action: "create", project: "p", title: "" })).toThrow();
  });

  it("DeleteTaskSchema coerces string taskId to number", () => {
    const result = DeleteTaskSchema.parse({ action: "delete", project: "p", taskId: "5" });
    expect(result.taskId).toBe(5);
  });

  it("UpdateStatusSchema works", () => {
    const result = UpdateStatusSchema.parse({ project: "p", taskId: 3, status: "done" });
    expect(result.taskId).toBe(3);
  });

  it("SubtaskAddSchema requires subtaskTitle", () => {
    expect(() => SubtaskAddSchema.parse({ project: "p", taskId: 1, subtaskAction: "add" })).toThrow();
  });

  it("AddChatSchema validates role enum", () => {
    expect(() => AddChatSchema.parse({
      action: "addChat", project: "p", taskId: 1, role: "invalid", content: "hi",
    })).toThrow();
  });
});

describe("TaskMaster schemas", () => {
  it("discriminates expand action", () => {
    const result = TaskMasterActionSchema.parse({
      action: "expand", project: "p", taskId: 3, num: 8, research: true,
    });
    expect(result.action).toBe("expand");
  });

  it("rejects unknown action", () => {
    expect(() => TaskMasterActionSchema.parse({ action: "unknown", project: "p" })).toThrow();
  });

  it("ai-create requires prompt", () => {
    expect(() => TaskMasterActionSchema.parse({ action: "ai-create", project: "p" })).toThrow();
  });
});

describe("Execute schema", () => {
  it("applies defaults for optional fields", () => {
    const result = ExecuteSchema.parse({ project: "p", taskId: "5", pane: "main:0.1" });
    expect(result.taskId).toBe(5);
    expect(result.session).toBe("new");
    expect(result.taskTitle).toBe("");
  });

  it("validates branchAction enum", () => {
    expect(() => ExecuteSchema.parse({
      project: "p", taskId: 1, pane: "x", branchAction: "invalid",
    })).toThrow();
  });
});

describe("AI schemas", () => {
  it("validates refine-task", () => {
    const result = AiActionSchema.parse({
      action: "refine-task",
      payload: { notes: "build auth" },
    });
    expect(result.action).toBe("refine-task");
  });

  it("validates chat with history", () => {
    const result = AiActionSchema.parse({
      action: "chat",
      payload: {
        title: "Test", description: "desc", message: "hello",
        history: [{ role: "user", content: "hi" }],
      },
    });
    expect(result.action).toBe("chat");
  });

  it("rejects unknown AI action", () => {
    expect(() => AiActionSchema.parse({ action: "unknown", payload: {} })).toThrow();
  });
});
