import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExecuteService, type TmuxExecutor } from "../../lib/services/execute-service";
import type { TaskService } from "../../lib/services/task-service";
import type { TaskMasterService } from "../../lib/services/task-master-service";
import type { GitService } from "../../lib/services/git-service";

function createMockTmux(): TmuxExecutor {
  return {
    sendKeys: vi.fn(),
    setEnv: vi.fn(),
  };
}

function createMockGit(): GitService {
  return {
    getCurrentCommit: vi.fn(() => "abc123"),
    createBranch: vi.fn(),
    createBranchFrom: vi.fn(),
    checkoutBranch: vi.fn(),
    listBranches: vi.fn(() => ({ current: "main", branches: ["main"] })),
    pushBranch: vi.fn(),
    getCommitCount: vi.fn(() => 0),
    createPr: vi.fn(() => null),
    autoCreatePr: vi.fn(() => null),
  } as unknown as GitService;
}

function createMockTaskMaster(): TaskMasterService {
  return {
    setStatus: vi.fn(async () => ({ success: true })),
  } as unknown as TaskMasterService;
}

function createMockTaskService(): TaskService {
  return {
    updateTaskFields: vi.fn(() => true),
    getProjects: vi.fn(() => ({})),
  } as unknown as TaskService;
}

describe("ExecuteService", () => {
  let tmux: TmuxExecutor;
  let git: ReturnType<typeof createMockGit>;
  let tm: ReturnType<typeof createMockTaskMaster>;
  let taskSvc: ReturnType<typeof createMockTaskService>;
  let svc: ExecuteService;

  beforeEach(() => {
    tmux = createMockTmux();
    git = createMockGit();
    tm = createMockTaskMaster();
    taskSvc = createMockTaskService();
    svc = new ExecuteService(tmux, git, tm, taskSvc);
  });

  describe("buildPrompt", () => {
    it("includes task id, title, description", () => {
      const prompt = svc.buildPrompt({
        project: "p", projectDir: "/tmp", taskId: 5,
        taskTitle: "Auth", taskDescription: "Build auth",
        pane: "s:0.0", mode: "auto", session: "new",
      });
      expect(prompt).toContain("Task ID:5");
      expect(prompt).toContain("Auth");
      expect(prompt).toContain("Build auth");
    });

    it("includes context files", () => {
      const prompt = svc.buildPrompt({
        project: "p", projectDir: "/tmp", taskId: 1,
        taskTitle: "T", taskDescription: "D",
        pane: "s:0.0", mode: "auto", session: "new",
        contextFiles: ["spec.md", "api.yaml"],
      });
      expect(prompt).toContain("spec.md, api.yaml");
    });

    it("escapes single quotes", () => {
      const prompt = svc.buildPrompt({
        project: "p", projectDir: "/tmp", taskId: 1,
        taskTitle: "It's a test", taskDescription: "D",
        pane: "s:0.0", mode: "auto", session: "new",
      });
      expect(prompt).toContain("\\'s");
    });
  });

  describe("resolveCommand", () => {
    it("returns direct claude-chill command for new/auto", () => {
      expect(svc.resolveCommand("new", "auto")).toContain("claude-chill");
      expect(svc.resolveCommand("new", "auto")).toContain("--dangerously-skip-permissions");
    });
    it("returns manual command without skip-permissions", () => {
      const cmd = svc.resolveCommand("resume", "manual");
      expect(cmd).toContain("claude-chill");
      expect(cmd).toContain("-r");
      expect(cmd).not.toContain("--dangerously-skip-permissions");
    });
    it("returns default for unknown", () => {
      expect(svc.resolveCommand("unknown", "auto")).toContain("claude-chill");
    });
  });

  describe("execute", () => {
    it("creates branch, sets env, sends keys, updates status", async () => {
      const result = await svc.execute({
        project: "myProj", projectDir: "/home/test",
        taskId: 3, taskTitle: "Title", taskDescription: "Desc",
        pane: "session:0.1", mode: "auto", session: "new",
      });
      expect(result.success).toBe(true);
      expect(git.getCurrentCommit).toHaveBeenCalledWith("/home/test");
      expect(git.createBranch).toHaveBeenCalled();
      expect(taskSvc.updateTaskFields).toHaveBeenCalled();
      expect(tmux.setEnv).toHaveBeenCalledWith("session", "TASK_ID", "3");
      expect(tmux.setEnv).toHaveBeenCalledWith("session", "TASK_PROJECT", "myProj");
      expect(tmux.sendKeys).toHaveBeenCalled();
      expect(tm.setStatus).toHaveBeenCalledWith("myProj", 3, "in-progress");
    });

    it("checks out existing branch when branchAction=checkout", async () => {
      await svc.execute({
        project: "p", projectDir: "/tmp",
        taskId: 1, taskTitle: "T", taskDescription: "D",
        pane: "s:0.0", mode: "auto", session: "new",
        branchAction: "checkout", branchName: "feature/auth",
      });
      expect(git.checkoutBranch).toHaveBeenCalledWith("/tmp", "feature/auth");
      expect(git.createBranch).not.toHaveBeenCalled();
      expect(taskSvc.updateTaskFields).toHaveBeenCalledWith("p", 1, expect.objectContaining({ branch: "feature/auth" }));
    });

    it("creates branch from base when branchAction=create with baseBranch", async () => {
      await svc.execute({
        project: "p", projectDir: "/tmp",
        taskId: 1, taskTitle: "T", taskDescription: "D",
        pane: "s:0.0", mode: "auto", session: "new",
        branchAction: "create", branchName: "feature/new", baseBranch: "develop",
      });
      expect(git.createBranchFrom).toHaveBeenCalledWith("/tmp", "feature/new", "develop");
      expect(taskSvc.updateTaskFields).toHaveBeenCalledWith("p", 1, expect.objectContaining({ branch: "feature/new" }));
    });

    it("creates branch without base when branchAction=create without baseBranch", async () => {
      await svc.execute({
        project: "p", projectDir: "/tmp",
        taskId: 1, taskTitle: "T", taskDescription: "D",
        pane: "s:0.0", mode: "auto", session: "new",
        branchAction: "create", branchName: "feature/new",
      });
      expect(git.createBranch).toHaveBeenCalledWith("/tmp", "feature/new");
    });

    it("skips branch operations when branchAction=stay", async () => {
      await svc.execute({
        project: "p", projectDir: "/tmp",
        taskId: 1, taskTitle: "T", taskDescription: "D",
        pane: "s:0.0", mode: "auto", session: "new",
        branchAction: "stay",
      });
      expect(git.checkoutBranch).not.toHaveBeenCalled();
      expect(git.createBranch).not.toHaveBeenCalled();
      expect(git.createBranchFrom).not.toHaveBeenCalled();
    });

    it("continues even if git branch creation fails", async () => {
      (git.getCurrentCommit as ReturnType<typeof vi.fn>).mockImplementation(() => { throw new Error("not a repo"); });
      const result = await svc.execute({
        project: "p", projectDir: "/tmp",
        taskId: 1, taskTitle: "T", taskDescription: "D",
        pane: "s:0.0", mode: "auto", session: "new",
      });
      expect(result.success).toBe(true);
      expect(tmux.sendKeys).toHaveBeenCalled();
    });
  });

  describe("interrupt", () => {
    it("returns error when no pane tracked", () => {
      const result = svc.interrupt("proj", 1);
      expect(result.success).toBe(false);
      expect(result.error).toBe("no pane tracked");
    });

    it("sends escape to tracked pane", async () => {
      await svc.execute({
        project: "p", projectDir: "/tmp",
        taskId: 1, taskTitle: "T", taskDescription: "D",
        pane: "s:0.0", mode: "auto", session: "new",
      });
      const result = svc.interrupt("p", 1);
      expect(result.success).toBe(true);
      expect(result.pane).toBe("s:0.0");
      expect(tmux.sendKeys).toHaveBeenCalledWith("s:0.0", "Escape");
    });
  });
});
