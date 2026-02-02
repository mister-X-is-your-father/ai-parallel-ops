export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { getProjects, updateTaskFields } from "@/lib/tasks";

export async function POST(req: NextRequest) {
  const { project, taskId, taskTitle, branch, startCommit } = await req.json();

  if (!project || !taskId || !branch) {
    return NextResponse.json({ error: "Missing project, taskId, or branch" }, { status: 400 });
  }

  const projects = getProjects();
  const projectDir = projects[project] || process.cwd();
  const opts = { cwd: projectDir, encoding: "utf-8" as const, timeout: 30000 };

  try {
    // Check if branch has commits
    const base = startCommit || "master";
    let commitCount = "";
    try { commitCount = execSync(`git rev-list --count ${base}..${branch}`, opts).trim(); } catch {}
    if (!commitCount || commitCount === "0") {
      return NextResponse.json({ error: "ブランチにコミットがありません。タスク完了後にコミットされるとPRを作成できます。" }, { status: 400 });
    }

    // Gather commit log for PR body
    let log = "";
    try { log = execSync(`git log --oneline ${base}..${branch}`, opts).trim(); } catch {}

    // Push branch to remote
    execSync(`git push -u origin ${branch}`, opts);

    // Create PR via gh CLI
    const title = `Task #${taskId}: ${taskTitle || branch}`;
    const bodyLines = log
      ? log.split("\n").map((l: string) => `- ${l}`).join("\n")
      : "No commits yet";
    const body = `## Task #${taskId}\n\n${bodyLines}`;

    let prUrl = "";
    try {
      const out = execSync(
        `gh pr create --title "${title.replace(/"/g, '\\"')}" --body "${body.replace(/"/g, '\\"')}" --head "${branch}" 2>&1`,
        opts
      ).trim();
      const m = out.match(/https:\/\/github\.com\/[^\s]+/);
      prUrl = m ? m[0] : out;
    } catch {
      // PR may already exist
      try {
        prUrl = execSync(`gh pr view "${branch}" --json url -q .url`, opts).trim();
      } catch {}
    }

    if (prUrl) {
      updateTaskFields(project, taskId, { prUrl });
      return NextResponse.json({ success: true, prUrl });
    }

    return NextResponse.json({ error: "Could not create or find PR" }, { status: 500 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
