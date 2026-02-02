"use server";

import { execSync } from "child_process";
import { createGitService, createTaskService } from "../container";

type ActionResult<T = unknown> = { success: true; data: T } | { success: false; error: string };

export async function listPanes(): Promise<{ target: string; command: string; size: string }[]> {
  try {
    const output = execSync(
      'tmux list-panes -a -F "#{session_name}:#{window_index}.#{pane_index} #{pane_current_command} #{pane_width}x#{pane_height}"',
      { encoding: "utf-8" },
    );
    return output.trim().split("\n").filter(Boolean).map((line) => {
      const [target, command, size] = line.split(" ");
      return { target, command, size };
    });
  } catch {
    return [];
  }
}

export async function listBranches(project: string) {
  const projects = createTaskService().getProjects();
  const projectDir = projects[project];
  if (!projectDir) return { current: "", branches: [] };
  return createGitService().listBranches(projectDir);
}

export async function checkoutBranch(project: string, branch: string): Promise<ActionResult> {
  const projects = createTaskService().getProjects();
  const projectDir = projects[project];
  if (!projectDir) return { success: false, error: "Project not found" };
  try {
    createGitService().checkoutBranch(projectDir, branch);
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function createBranch(project: string, branch: string, baseBranch?: string): Promise<ActionResult> {
  const projects = createTaskService().getProjects();
  const projectDir = projects[project];
  if (!projectDir) return { success: false, error: "Project not found" };
  try {
    if (baseBranch) {
      createGitService().createBranchFrom(projectDir, branch, baseBranch);
    } else {
      createGitService().createBranch(projectDir, branch);
    }
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function createPr(input: {
  project: string; taskId: string; taskTitle?: string; branch: string; startCommit?: string;
}): Promise<ActionResult> {
  const { project, taskId, taskTitle, branch, startCommit } = input;
  if (!project || !taskId || !branch) return { success: false, error: "Missing project, taskId, or branch" };

  const projects = createTaskService().getProjects();
  const projectDir = projects[project] || process.cwd();
  const opts = { cwd: projectDir, encoding: "utf-8" as const, timeout: 30000 };

  try {
    const base = startCommit || "master";
    let commitCount = "";
    try { commitCount = execSync(`git rev-list --count ${base}..${branch}`, opts).trim(); } catch {}
    if (!commitCount || commitCount === "0") {
      return { success: false, error: "ブランチにコミットがありません。" };
    }

    let log = "";
    try { log = execSync(`git log --oneline ${base}..${branch}`, opts).trim(); } catch {}

    execSync(`git push -u origin ${branch}`, opts);

    const title = `Task #${taskId}: ${taskTitle || branch}`;
    const bodyLines = log ? log.split("\n").map((l: string) => `- ${l}`).join("\n") : "No commits yet";
    const body = `## Task #${taskId}\n\n${bodyLines}`;

    let prUrl = "";
    try {
      const out = execSync(
        `gh pr create --title "${title.replace(/"/g, '\\"')}" --body "${body.replace(/"/g, '\\"')}" --head "${branch}" 2>&1`,
        opts,
      ).trim();
      const m = out.match(/https:\/\/github\.com\/[^\s]+/);
      prUrl = m ? m[0] : out;
    } catch {
      try { prUrl = execSync(`gh pr view "${branch}" --json url -q .url`, opts).trim(); } catch {}
    }

    if (prUrl) {
      const { updateTaskFields } = await import("../tasks");
      updateTaskFields(project, Number(taskId), { prUrl });
      return { success: true, data: { prUrl } };
    }

    return { success: false, error: "Could not create or find PR" };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getReview(input: {
  project: string; startCommit: string; branch?: string;
}): Promise<ActionResult> {
  const { project, startCommit, branch } = input;
  if (!project || !startCommit) return { success: false, error: "Missing project or startCommit" };

  const projects = createTaskService().getProjects();
  const projectDir = projects[project] || process.cwd();
  const opts = { cwd: projectDir, encoding: "utf-8" as const, maxBuffer: 5 * 1024 * 1024 };
  const ref = branch || "HEAD";

  try {
    const diffStat = execSync(`git diff --stat ${startCommit}..${ref}`, opts).trim();
    const diff = execSync(`git diff ${startCommit}..${ref}`, opts).trim();
    const log = execSync(`git log --oneline ${startCommit}..${ref}`, opts).trim();
    const untracked = execSync(`git status --porcelain`, opts).trim();
    const headCommit = execSync(`git rev-parse ${ref}`, opts).trim();

    return { success: true, data: { diffStat, diff, log, untracked, startCommit, headCommit, branch: branch || null } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function suggestFollowUpTasks(input: {
  project: string; taskId: string; taskTitle?: string; taskDescription?: string;
  startCommit?: string; branch?: string; acceptanceCriteria?: string[];
}) {
  const { project, taskId, taskTitle, taskDescription, startCommit, branch } = input;
  if (!project || !taskId) return { suggestions: [], context: "" };

  const projects = createTaskService().getProjects();
  const projectDir = projects[project] || process.cwd();
  const opts = { cwd: projectDir, encoding: "utf-8" as const, maxBuffer: 5 * 1024 * 1024 };

  let diffStat = "";
  if (startCommit) {
    const ref = branch || "HEAD";
    try { diffStat = execSync(`git diff --stat ${startCommit}..${ref}`, opts).trim(); } catch {}
  }

  const suggestions: { title: string; description: string }[] = [];
  suggestions.push({ title: `${taskTitle} - テスト追加`, description: `「${taskTitle}」の変更に対するユニットテスト・統合テストを追加` });
  if (diffStat) suggestions.push({ title: `${taskTitle} - ドキュメント更新`, description: `変更内容に合わせてREADMEや関連ドキュメントを更新` });
  suggestions.push({ title: `${taskTitle} - リファクタリング`, description: `実装のコード品質改善、パフォーマンス最適化` });

  return { suggestions };
}
