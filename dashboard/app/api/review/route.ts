export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { getProjects } from "@/lib/tasks";

export async function POST(req: NextRequest) {
  const { project, startCommit, branch } = await req.json();

  if (!project || !startCommit) {
    return NextResponse.json({ error: "Missing project or startCommit" }, { status: 400 });
  }

  const projects = getProjects();
  const projectDir = projects[project] || process.cwd();
  const opts = { cwd: projectDir, encoding: "utf-8" as const, maxBuffer: 5 * 1024 * 1024 };

  // If a branch is specified, get its tip; otherwise use HEAD
  const ref = branch || "HEAD";

  try {
    const diffStat = execSync(`git diff --stat ${startCommit}..${ref}`, opts).trim();
    const diff = execSync(`git diff ${startCommit}..${ref}`, opts).trim();
    const log = execSync(`git log --oneline ${startCommit}..${ref}`, opts).trim();
    const untracked = execSync(`git status --porcelain`, opts).trim();
    const headCommit = execSync(`git rev-parse ${ref}`, opts).trim();

    return NextResponse.json({
      diffStat,
      diff,
      log,
      untracked,
      startCommit,
      headCommit,
      branch: branch || null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
