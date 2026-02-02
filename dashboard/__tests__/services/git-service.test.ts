import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitService, type ShellExecutor } from "../../lib/services/git-service";
import type { Task } from "../../lib/domain/types";

function createMockShell(responses: Record<string, string> = {}): ShellExecutor {
  return {
    execSync: vi.fn((cmd: string) => {
      for (const [pattern, response] of Object.entries(responses)) {
        if (cmd.includes(pattern)) return response;
      }
      return "";
    }),
  };
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: "Test",
    description: "desc",
    status: "done",
    priority: "medium",
    dependencies: [],
    subtasks: [],
    branch: "task/1-123",
    startCommit: "abc123",
    ...overrides,
  };
}

describe("GitService", () => {
  let shell: ShellExecutor;
  let git: GitService;

  beforeEach(() => {
    shell = createMockShell({
      "rev-parse HEAD": "abc123\n",
      "rev-list --count": "3\n",
      "gh pr create": "https://github.com/org/repo/pull/42\n",
    });
    git = new GitService(shell);
  });

  describe("getCurrentCommit", () => {
    it("returns trimmed commit hash", () => {
      expect(git.getCurrentCommit("/tmp")).toBe("abc123");
    });
  });

  describe("getCommitCount", () => {
    it("returns parsed count", () => {
      expect(git.getCommitCount("/tmp", "abc", "def")).toBe(3);
    });

    it("returns 0 on error", () => {
      shell = createMockShell();
      (shell.execSync as ReturnType<typeof vi.fn>).mockImplementation(() => { throw new Error("fail"); });
      git = new GitService(shell);
      expect(git.getCommitCount("/tmp", "abc", "def")).toBe(0);
    });
  });

  describe("createPr", () => {
    it("extracts github URL from output", () => {
      const url = git.createPr("/tmp", "Title", "Body", "branch");
      expect(url).toBe("https://github.com/org/repo/pull/42");
    });

    it("falls back to gh pr view on error", () => {
      let callCount = 0;
      shell = {
        execSync: vi.fn((cmd: string) => {
          callCount++;
          if (cmd.includes("pr create")) throw new Error("already exists");
          if (cmd.includes("pr view")) return "https://github.com/org/repo/pull/99";
          return "";
        }),
      };
      git = new GitService(shell);
      expect(git.createPr("/tmp", "T", "B", "br")).toBe("https://github.com/org/repo/pull/99");
    });
  });

  describe("listBranches", () => {
    it("returns current branch and list", () => {
      shell = createMockShell({
        "branch --show-current": "main\n",
        "branch --format": "main\nfeature/auth\nfix/login\n",
      });
      git = new GitService(shell);
      const result = git.listBranches("/tmp");
      expect(result.current).toBe("main");
      expect(result.branches).toEqual(["main", "feature/auth", "fix/login"]);
    });

    it("returns empty on non-git directory", () => {
      (shell.execSync as ReturnType<typeof vi.fn>).mockImplementation(() => { throw new Error("not a repo"); });
      git = new GitService(shell);
      const result = git.listBranches("/tmp");
      expect(result.current).toBe("");
      expect(result.branches).toEqual([]);
    });
  });

  describe("checkoutBranch", () => {
    it("calls git checkout with branch name", () => {
      git.checkoutBranch("/tmp", "feature/auth");
      expect(shell.execSync).toHaveBeenCalledWith(
        "git checkout feature/auth",
        expect.anything()
      );
    });
  });

  describe("createBranchFrom", () => {
    it("calls git checkout -b with base branch", () => {
      git.createBranchFrom("/tmp", "feature/new", "develop");
      expect(shell.execSync).toHaveBeenCalledWith(
        "git checkout -b feature/new develop",
        expect.anything()
      );
    });
  });

  describe("autoCreatePr", () => {
    it("returns null if no branch", () => {
      expect(git.autoCreatePr("/tmp", makeTask({ branch: undefined }))).toBeNull();
    });

    it("returns null if PR already exists", () => {
      expect(git.autoCreatePr("/tmp", makeTask({ prUrl: "existing" }))).toBeNull();
    });

    it("returns null if no commits", () => {
      shell = createMockShell({ "rev-list --count": "0\n" });
      git = new GitService(shell);
      expect(git.autoCreatePr("/tmp", makeTask())).toBeNull();
    });

    it("pushes and creates PR when commits exist", () => {
      const url = git.autoCreatePr("/tmp", makeTask());
      expect(url).toBe("https://github.com/org/repo/pull/42");
      expect(shell.execSync).toHaveBeenCalledWith(
        expect.stringContaining("git push -u origin task/1-123"),
        expect.anything()
      );
    });
  });
});
