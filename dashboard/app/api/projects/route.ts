export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";

const PROJECTS_FILE = join(process.cwd(), "..", ".taskmaster", "projects.json");

function getProjects(): Record<string, string> {
  try {
    if (existsSync(PROJECTS_FILE)) {
      return JSON.parse(readFileSync(PROJECTS_FILE, "utf-8"));
    }
  } catch {}
  return {};
}

function saveProjects(projects: Record<string, string>) {
  writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
}

export async function GET() {
  return NextResponse.json(getProjects());
}

export async function POST(req: NextRequest) {
  const { action, name, path } = await req.json();
  const projects = getProjects();

  if (action === "add") {
    if (!name || !path) {
      return NextResponse.json({ error: "name and path required" }, { status: 400 });
    }
    // Initialize task-master if not already set up
    const tmDir = join(path, ".taskmaster");
    if (!existsSync(join(tmDir, "config.json"))) {
      try {
        execSync(`npx -y task-master-ai init -y --name="${name}"`, {
          cwd: path,
          encoding: "utf-8",
          timeout: 30000,
        });
      } catch {
        // init failed — project will work without task-master features
      }
    }
    projects[name] = path;
    saveProjects(projects);
    return NextResponse.json({ success: true, projects });
  }

  if (action === "remove") {
    if (!name) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }
    delete projects[name];
    saveProjects(projects);
    return NextResponse.json({ success: true, projects });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
