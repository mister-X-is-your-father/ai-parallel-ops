import type { Task } from "../domain/types";

export interface ShellExecutor {
  execSync(cmd: string, opts: { cwd: string; encoding: "utf-8"; timeout?: number }): string;
}

export class GitService {
  constructor(private shell: ShellExecutor) {}

  getCurrentCommit(cwd: string): string {
    return this.shell.execSync("git rev-parse HEAD", { cwd, encoding: "utf-8" }).trim();
  }

  listBranches(cwd: string): { current: string; branches: string[] } {
    try {
      const current = this.shell.execSync("git branch --show-current", { cwd, encoding: "utf-8" }).trim();
      const raw = this.shell.execSync("git branch --format=%(refname:short)", { cwd, encoding: "utf-8" }).trim();
      const branches = raw ? raw.split("\n").map(b => b.trim()).filter(Boolean) : [];
      return { current, branches };
    } catch {
      return { current: "", branches: [] };
    }
  }

  checkoutBranch(cwd: string, branchName: string): void {
    this.shell.execSync(`git checkout ${branchName}`, { cwd, encoding: "utf-8" });
  }

  createBranch(cwd: string, branchName: string): void {
    this.shell.execSync(`git checkout -b ${branchName}`, { cwd, encoding: "utf-8" });
  }

  createBranchFrom(cwd: string, branchName: string, baseBranch: string): void {
    this.shell.execSync(`git checkout -b ${branchName} ${baseBranch}`, { cwd, encoding: "utf-8" });
  }

  pushBranch(cwd: string, branchName: string): void {
    this.shell.execSync(`git push -u origin ${branchName}`, { cwd, encoding: "utf-8", timeout: 30000 });
  }

  getCommitCount(cwd: string, base: string, head: string): number {
    try {
      const count = this.shell.execSync(
        `git rev-list --count ${base}..${head}`,
        { cwd, encoding: "utf-8", timeout: 30000 }
      ).trim();
      return parseInt(count, 10) || 0;
    } catch {
      return 0;
    }
  }

  createPr(cwd: string, title: string, body: string, head: string): string | null {
    try {
      const out = this.shell.execSync(
        `gh pr create --title "${title}" --body "${body}" --head "${head}" 2>&1`,
        { cwd, encoding: "utf-8", timeout: 30000 }
      ).trim();
      const m = out.match(/https:\/\/github\.com\/[^\s]+/);
      return m ? m[0] : out;
    } catch {
      // PR may already exist
      try {
        return this.shell.execSync(
          `gh pr view "${head}" --json url -q .url`,
          { cwd, encoding: "utf-8", timeout: 30000 }
        ).trim() || null;
      } catch {
        return null;
      }
    }
  }

  /**
   * Push branch and create PR for a task. Returns PR URL or null.
   */
  autoCreatePr(cwd: string, task: Task): string | null {
    if (!task.branch || task.prUrl) return null;

    const base = task.startCommit || "master";
    const commitCount = this.getCommitCount(cwd, base, task.branch);
    if (commitCount === 0) return null;

    try { this.pushBranch(cwd, task.branch); } catch { /* ignore */ }

    const title = `Task #${task.id}: ${task.title}`.replace(/"/g, '\\"');
    return this.createPr(cwd, title, `Task #${task.id}`, task.branch);
  }
}
