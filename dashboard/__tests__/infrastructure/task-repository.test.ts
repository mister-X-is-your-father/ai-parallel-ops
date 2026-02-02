import { describe, it, expect, vi } from "vitest";
import { FileTaskRepository, type FileSystem } from "../../lib/infrastructure/task-repository";

function mockFs(files: Record<string, string>): FileSystem {
  return {
    readFileSync: vi.fn((path: string) => {
      if (files[path]) return files[path];
      throw new Error("ENOENT: " + path);
    }),
    writeFileSync: vi.fn(),
    existsSync: vi.fn((path: string) => path in files),
  };
}

describe("FileTaskRepository", () => {
  const hubPath = "/hub/tasks.json";
  const projPath = "/projects.json";

  const hubData = JSON.stringify({
    myProject: {
      tasks: [
        { id: 1, title: "T1", description: "", status: "pending", priority: "high", dependencies: [], subtasks: [] },
      ],
      metadata: {},
    },
  });

  describe("getProjects", () => {
    it("returns projects from file", () => {
      const fs = mockFs({ [projPath]: JSON.stringify({ foo: "/foo" }) });
      const repo = new FileTaskRepository(hubPath, projPath, fs);
      expect(repo.getProjects()).toEqual({ foo: "/foo" });
    });
    it("returns empty when file missing", () => {
      const fs = mockFs({});
      const repo = new FileTaskRepository(hubPath, projPath, fs);
      expect(repo.getProjects()).toEqual({});
    });
  });

  describe("getAllTasks", () => {
    it("reads hub tasks", () => {
      const fs = mockFs({ [hubPath]: hubData, [projPath]: "{}" });
      const repo = new FileTaskRepository(hubPath, projPath, fs);
      const result = repo.getAllTasks();
      expect(result.myProject.tasks).toHaveLength(1);
      expect(result.myProject.tasks[0].title).toBe("T1");
    });

    it("reads per-project tasks", () => {
      const projTasks = JSON.stringify({
        default: { tasks: [{ id: 10, title: "PT", description: "", status: "done", priority: "low", dependencies: [], subtasks: [] }], metadata: {} },
      });
      const fs = mockFs({
        [hubPath]: "{}",
        [projPath]: JSON.stringify({ ext: "/ext" }),
        "/ext/.taskmaster/tasks/tasks.json": projTasks,
      });
      const repo = new FileTaskRepository(hubPath, projPath, fs);
      const result = repo.getAllTasks();
      expect(result.ext.tasks[0].title).toBe("PT");
    });

    it("returns empty when files missing", () => {
      const fs = mockFs({});
      const repo = new FileTaskRepository(hubPath, projPath, fs);
      expect(repo.getAllTasks()).toEqual({});
    });
  });

  describe("findTask", () => {
    it("finds task in hub", () => {
      const fs = mockFs({ [hubPath]: hubData, [projPath]: "{}" });
      const repo = new FileTaskRepository(hubPath, projPath, fs);
      const found = repo.findTask("myProject", 1);
      expect(found).not.toBeNull();
      expect(found!.task.title).toBe("T1");
    });

    it("returns null when not found", () => {
      const fs = mockFs({ [hubPath]: hubData, [projPath]: "{}" });
      const repo = new FileTaskRepository(hubPath, projPath, fs);
      expect(repo.findTask("myProject", 999)).toBeNull();
    });
  });

  describe("saveFile", () => {
    it("writes JSON", () => {
      const fs = mockFs({ [hubPath]: hubData });
      const repo = new FileTaskRepository(hubPath, projPath, fs);
      repo.saveFile("/out.json", { a: 1 });
      expect(fs.writeFileSync).toHaveBeenCalledWith("/out.json", JSON.stringify({ a: 1 }, null, 2));
    });
  });
});
