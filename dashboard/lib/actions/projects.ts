"use server";

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "fs";
import { execSync } from "child_process";
import { join, basename } from "path";
import { homedir } from "os";

const PROJECTS_FILE = join(process.cwd(), "..", ".taskmaster", "projects.json");

function getProjectsMap(): Record<string, string> {
  try {
    if (existsSync(PROJECTS_FILE)) return JSON.parse(readFileSync(PROJECTS_FILE, "utf-8"));
  } catch {}
  return {};
}

function saveProjects(projects: Record<string, string>) {
  writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
}

type ActionResult<T = unknown> = { success: true; data: T } | { success: false; error: string };

export async function getProjects() {
  return getProjectsMap();
}

export async function addProject(name: string, path: string): Promise<ActionResult> {
  if (!name || !path) return { success: false, error: "name and path required" };
  const projects = getProjectsMap();

  const tmDir = join(path, ".taskmaster");
  if (!existsSync(join(tmDir, "config.json"))) {
    try {
      execSync(`npx -y task-master-ai init -y --name="${name}"`, {
        cwd: path, encoding: "utf-8", timeout: 30000,
      });
    } catch {}
  }

  projects[name] = path;
  saveProjects(projects);
  return { success: true, data: projects };
}

export async function removeProject(name: string): Promise<ActionResult> {
  if (!name) return { success: false, error: "name required" };
  const projects = getProjectsMap();
  delete projects[name];
  saveProjects(projects);
  return { success: true, data: projects };
}

export async function searchDirectories(query: string) {
  const home = homedir();
  let searchDir: string;
  let prefix: string;

  if (query === "" || query === "/") {
    searchDir = home;
    prefix = home;
  } else {
    const resolved = query.startsWith("~") ? join(home, query.slice(1)) : query;
    if (query.endsWith("/")) {
      searchDir = resolved;
      prefix = resolved;
    } else {
      searchDir = join(resolved, "..");
      prefix = searchDir;
    }
  }

  try {
    const entries = readdirSync(searchDir, { withFileTypes: true });
    const dirs = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => join(prefix, e.name))
      .filter((fullPath) => {
        const resolved = query.startsWith("~") ? join(home, query.slice(1)) : query;
        if (query.endsWith("/")) return true;
        return fullPath.toLowerCase().includes(resolved.toLowerCase()) ||
          basename(fullPath).toLowerCase().includes(basename(resolved).toLowerCase());
      })
      .sort()
      .slice(0, 50);
    return { dirs, home };
  } catch {
    return { dirs: [] as string[], home };
  }
}
