export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createGitService, createTaskService } from "@/lib/container";

const gitService = createGitService();
const taskService = createTaskService();

export async function GET(req: NextRequest) {
  const project = req.nextUrl.searchParams.get("project");
  if (!project) {
    return NextResponse.json({ error: "Missing project" }, { status: 400 });
  }

  const projects = taskService.getProjects();
  const projectDir = projects[project];
  if (!projectDir) {
    return NextResponse.json({ current: "", branches: [] });
  }

  const result = gitService.listBranches(projectDir);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const { project, branch, baseBranch, action } = await req.json();

  if (!project || !action) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const projects = taskService.getProjects();
  const projectDir = projects[project];
  if (!projectDir) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    if (action === "checkout") {
      gitService.checkoutBranch(projectDir, branch);
      return NextResponse.json({ success: true });
    }
    if (action === "create") {
      if (baseBranch) {
        gitService.createBranchFrom(projectDir, branch, baseBranch);
      } else {
        gitService.createBranch(projectDir, branch);
      }
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
