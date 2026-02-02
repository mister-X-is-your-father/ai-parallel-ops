export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { getProjects } from "@/lib/tasks";

export async function POST(req: NextRequest) {
  const { project, taskId, taskTitle, taskDescription, startCommit, branch, acceptanceCriteria } = await req.json();

  if (!project || !taskId) {
    return NextResponse.json({ error: "Missing project or taskId" }, { status: 400 });
  }

  const projects = getProjects();
  const projectDir = projects[project] || process.cwd();
  const opts = { cwd: projectDir, encoding: "utf-8" as const, maxBuffer: 5 * 1024 * 1024 };

  // Gather context: git diff summary
  let diffStat = "";
  let log = "";
  if (startCommit) {
    const ref = branch || "HEAD";
    try {
      diffStat = execSync(`git diff --stat ${startCommit}..${ref}`, opts).trim();
      log = execSync(`git log --oneline ${startCommit}..${ref}`, opts).trim();
    } catch {}
  }

  // Build suggestion prompt for task-master AI
  const context = [
    `Completed task: #${taskId} ${taskTitle}`,
    taskDescription ? `Description: ${taskDescription}` : "",
    acceptanceCriteria?.length ? `Acceptance criteria: ${acceptanceCriteria.join("; ")}` : "",
    diffStat ? `Changes:\n${diffStat}` : "",
    log ? `Commits:\n${log}` : "",
  ].filter(Boolean).join("\n");

  // Use task-master CLI to generate suggestions
  try {
    const result = execSync(
      `npx -y task-master-ai analyze-complexity --research-only`,
      { ...opts, timeout: 30000 }
    ).trim();

    // Fallback: return structured suggestions based on common patterns
    const suggestions = generateSuggestions(taskTitle, taskDescription, diffStat);
    return NextResponse.json({ suggestions, context });
  } catch {
    // task-master analyze not available — use heuristic suggestions
    const suggestions = generateSuggestions(taskTitle, taskDescription, diffStat);
    return NextResponse.json({ suggestions, context });
  }
}

function generateSuggestions(
  title: string,
  description: string,
  diffStat: string
): { title: string; description: string }[] {
  const suggestions: { title: string; description: string }[] = [];

  // Always suggest testing
  suggestions.push({
    title: `${title} - テスト追加`,
    description: `「${title}」の変更に対するユニットテスト・統合テストを追加`,
  });

  // If there were file changes, suggest documentation
  if (diffStat) {
    suggestions.push({
      title: `${title} - ドキュメント更新`,
      description: `変更内容に合わせてREADMEや関連ドキュメントを更新`,
    });
  }

  // Suggest review/refactoring
  suggestions.push({
    title: `${title} - リファクタリング`,
    description: `実装のコード品質改善、パフォーマンス最適化`,
  });

  return suggestions;
}
